#!/usr/bin/env python3
"""Normalizza i placeholder [campo] -> {campo} nei template .docx.

Word spezza i placeholder fra piu' <w:r> (run) con formattazione identica.
Strategia:
  1. unisci i run adiacenti compatibili dentro ogni paragrafo (run merging)
  2. ora i placeholder sono contigui in un solo <w:t> -> riparali e rinominali
  3. riscrivi il .docx

Backup originali: templates/_backup/
"""
import re
import shutil
import zipfile
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
PARTS = ("word/document.xml", "word/header1.xml", "word/footer1.xml")

# ---------------------------------------------------------------- run merge
RUN_RE = re.compile(r"<w:r>(?:(?!</?w:r[ >]).)*?</w:r>", re.S)
RPR_RE = re.compile(r"<w:rPr>.*?</w:rPr>", re.S)
# un run "semplice" = rPr opzionale + uno o piu' w:t, nient'altro (no tab, br, drawing)
SIMPLE_RUN_RE = re.compile(
    r"^<w:r>(?P<rpr><w:rPr>.*?</w:rPr>)?(?P<body>(?:<w:t(?: [^>]*)?>.*?</w:t>)+)</w:r>$", re.S
)
WT_RE = re.compile(r"<w:t(?: [^>]*)?>(.*?)</w:t>", re.S)
# w:lang e' solo un marcatore del correttore ortografico: non e' formattazione
# visibile e Word lo alterna a meta' parola, spezzando i placeholder.
LANG_RE = re.compile(r"<w:lang [^>]*/>")


def rpr_key(rpr: str) -> str:
    """Firma della formattazione, ignorando w:lang."""
    return LANG_RE.sub("", rpr)


def merge_runs(xml: str) -> str:
    """Unisce run adiacenti con la stessa formattazione in un unico run."""
    runs = list(RUN_RE.finditer(xml))
    if not runs:
        return xml

    out, i, cursor = [], 0, 0
    while i < len(runs):
        m = runs[i]
        sm = SIMPLE_RUN_RE.match(m.group(0))
        if not sm:
            i += 1
            continue

        rpr = sm.group("rpr") or ""
        texts = WT_RE.findall(sm.group("body"))
        end = m.end()
        j = i + 1
        # assorbi i run successivi *immediatamente adiacenti* con stesso rPr
        while j < len(runs):
            nxt = runs[j]
            if xml[end:nxt.start()].strip():  # c'e' altro markup fra i due run
                break
            nsm = SIMPLE_RUN_RE.match(nxt.group(0))
            if not nsm or rpr_key(nsm.group("rpr") or "") != rpr_key(rpr):
                break
            texts.extend(WT_RE.findall(nsm.group("body")))
            end = nxt.end()
            j += 1

        if j > i + 1:  # qualcosa e' stato unito
            merged = f'<w:r>{rpr}<w:t xml:space="preserve">{"".join(texts)}</w:t></w:r>'
            out.append(xml[cursor:m.start()])
            out.append(merged)
            cursor = end
        i = j if j > i + 1 else i + 1

    out.append(xml[cursor:])
    return "".join(out)


# ------------------------------------------------- riparazioni sul testo
# applicate DOPO il merge, quando i placeholder sono contigui.
TEXT_FIXES = {
    "1": [
        # destinazione del trasporto, non la citta' di nascita
        ("nel comune di [personBirthCity]", "nel comune di [destinationCity]"),
    ],
    "2": [
        ("al cimitero di [personBirthCity], [personBirthCityProvince]",
         "al cimitero di [destinationCity], [destinationProvince]"),
        ("al Cimitero del Comune di [personBirthCity]",
         "al Cimitero del Comune di [destinationCity]"),
        # data fissa rimasta nell'originale: allineata agli altri 4 documenti
        ("Luogo e data, San Severo 03/07/2026", "Luogo e data, San Severo [today date]"),
    ],
    "3": [
        # parentesi mai chiusa nell'originale; e' la destinazione, non la nascita
        ("[personBirthCity; la partenza", "[destinationCity]; la partenza"),
    ],
    "5": [
        # "deceduto in X, il giorno [...]" -> e' la data di DECESSO, non di nascita
        ("il giorno [personBirthDate]", "il giorno [personDeathDate]"),
    ],
}

# ------------------------------------------------------------- rinomina
RENAME = {
    # defunto - anagrafica
    "personName": "personFirstName",
    "personSurname": "personLastName",
    "personFirstName": "personFirstName",
    "personLastName": "personLastName",
    "personBirthCity": "personBirthCity",
    "personBirthCityProvince": "personBirthProvince",
    "personBirthDate": "personBirthDate",
    "personBirthDate dd/mm/yyyy": "personBirthDate",
    "personBirthdate": "personBirthDate",            # refuso doc4
    "personRecidencyCity": "personResidenceCity",    # refuso Recidency
    "personStreetWay": "personResidenceAddress",
    "personCodiceFiscale": "personTaxCode",
    # defunto - decesso
    "personDeathDate": "personDeathDate",
    "personDeathDateTime": "personDeathTime",        # e' un'ora
    "personDeathCity": "personDeathCity",
    "personDeathPlace": "personDeathPlace",
    # trasporto
    "personTransportationDate": "transportDate",
    "personTransportationTime": "transportTime",
    "personTransportationDateTime": "transportTime",  # doc4: e' un'ora
    "personPermissionTransportation": "transportPermitDate",
    "personChurchPlace": "funeralChurch",
    # destinazione
    "destinationCity": "destinationCity",
    "destinationProvince": "destinationProvince",
    "personCimiteryDestination": "destinationCemetery",
    # impresa funebre
    "ownerFirstName": "ownerFirstName",
    "ownerMidName": "ownerMiddleName",
    "ownerLastName": "ownerLastName",
    "OwnerBirthDate dd/MM/yyyy": "ownerRequestDate",  # e' la data della domanda
    "ownerCompanyName": "ownerCompanyName",
    "ownerCompanyBirthCity": "ownerCompanyCity",
    "ownerBirthCity": "ownerCity",
    "OwnerBirthCity": "ownerCity",
    "ownerCityName": "ownerCityName",
    "ownerCarTarga": "ownerVehiclePlate",
    "ownerEmployeeDriver": "ownerDriverName",
    # sistema
    "today date": "todayDate",
}


def rename_placeholders(xml: str, report: list) -> str:
    unknown = []

    def repl(m):
        raw = m.group(1).strip()
        new = RENAME.get(raw)
        if new is None:
            unknown.append(raw)
            return m.group(0)
        return "{" + new + "}"

    xml = re.sub(r"\[([^\[\]<>]{1,60}?)\]", repl, xml)
    for u in sorted(set(unknown)):
        report.append(f"  [WARN] sconosciuto, lasciato: [{u}]")
    return xml


def visible_text(xml: str) -> str:
    return "".join(WT_RE.findall(xml))


def process(doc_id: str):
    src = TEMPLATES / f"{doc_id}.docx"
    with zipfile.ZipFile(src) as z:
        names = z.namelist()
        data = {n: z.read(n) for n in names}

    report = [f"== {src.name} =="]

    for part in PARTS:
        if part not in data:
            continue
        xml = data[part].decode("utf-8")
        xml = merge_runs(xml)

        # fix testuali: solo su document.xml, una volta sola
        if part == "word/document.xml":
            for frm, to in TEXT_FIXES.get(doc_id, []):
                n = xml.count(frm)
                if n:
                    xml = xml.replace(frm, to)
                    report.append(f"  [fix x{n}] {frm!r} -> {to!r}")
                else:
                    report.append(f"  [WARN] non trovato: {frm!r}")

        data[part] = rename_placeholders(xml, report).encode("utf-8")

    tmp = src.with_suffix(".docx.tmp")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for n in names:
            z.writestr(n, data[n])
    shutil.move(tmp, src)

    # verifica finale
    with zipfile.ZipFile(src) as z:
        txt = visible_text(z.read("word/document.xml").decode("utf-8"))
    fields = re.findall(r"\{([^{}]+)\}", txt)
    leftovers = re.findall(r"\[([^\[\]]{0,60})\]", txt)
    report.append(f"  campi ({len(set(fields))}): {sorted(set(fields))}")
    if leftovers:
        report.append(f"  [WARN] quadre rimaste: {leftovers}")
    print("\n".join(report), "\n")
    return set(fields)


if __name__ == "__main__":
    allf = set()
    for d in ("1", "2", "3", "4", "5"):
        allf |= process(d)
    print(f"=== SCHEMA COMPLETO ({len(allf)} campi) ===")
    for f in sorted(allf):
        print(" -", f)
