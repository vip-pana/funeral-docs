#!/usr/bin/env python3
"""Turns the two transport-and-cremation forms into templates.

The request (8.docx) and the authorisation (9.docx) required by L.R. 34/2008
art.12 c.1 and art.13 c.1-3 arrived filled in with a real person's data, exactly
like the two attachments handled by placeholders-6-7.py: there is no `[field]`
placeholder to rename, so every value has to be substituted by hand.

Only the burial branch of the ashes destination is filled in: personal keeping
and scattering stay as blank lines to be ticked and written by hand, like
`Prot. n. ____` in every other form.

Reads from templates/_backup/, writes templates/{8,9}.docx. Idempotent.
"""
import re
import shutil
import zipfile
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"

# Exact `<w:t>` contents -> replacement, applied to both documents.
COMMON = [
    # Declarant, from Impostazioni. The name is one run here, unlike in 6 and 7.
    ("ROSSI MARIO",
     "{ownerFirstName} {ownerMiddleName} {ownerLastName}"),
    ("71016", "{ownerPostalCode}"),
    ("CA1577CS", "{ownerIdNumber}"),
    ("10/06/2020", "{ownerIdDate}"),
    # The deceased.
    ("TARDIOLA FRANCESCO MICHELE", "{personFirstName} {personLastName}"),
    ("VRDLGU44D02H501V", "{personTaxCode}"),
    ("02/04/1944", "{personBirthDate}"),
    ("24/06/2026", "{personDeathDate}"),
    ("25/06/2026", "{todayDate}"),
    ("italiana", "{personCitizenship}"),  # narrowed per document below
    ("FY363SC", "{ownerVehiclePlate}"),
]

# Values Word split across several runs: the pieces are joined into the first
# one and the rest emptied.
SPLIT = {
    "8": [
        # "Via S. AGOSTINO": street and number are one field, so the literal
        # "Via " goes too — the value carries its own.
        ([" in ", "Via ", "S. AGOSTINO"], " in {personResidenceAddress}"),
        # Permesso di seppellimento: "__.__.____" over four runs.
        (["_", "_.__._", "___"], "{burialPermitDate}"),
        # The four numbered pallbearers collapse into the one comma-separated
        # string the practice already stores.
        (["1) ", "PERILLO DANIELE", "; 2) ", "CIAVARELLA MATTEO", "; 3) ",
          "IACOVELLI LUIGI", "; 4) ", "PISTILLO ENZO"], "{bearerNames}"),
    ],
    "9": [
        ([" in ", "Via ", "Soccorso n. 159 "], " in {ownerAddress} "),
        (["SANT’AGOSTINO N.3"], "{personResidenceAddress}"),
        # Time of death: "11" ":" "48".
        (["11", ":", "48"], "{personDeathTime}"),
        (["1) ", "PISTILLO VINCENZO", "; 2) ", "CIAVARELLA MATTEO", ";",
          "3) ", "IACOVELLI LUIGI", "; 4) ", "PERILLO DANIELE"],
         "{bearerNames}"),
        # "Seppellimento nel Cimitero di SERRACAPRIOLA (FG)  ove verranno
        # tumulate." — only the municipality is named, there is no cemetery
        # name to fill in.
        (["SERRACAPRIOLA (", "FG)"], "{ashesCity} ({ashesProvince})"),
    ],
}

PER_DOC = {
    "8": [
        ("CITTA’ DI SAN SEVERO", "CITTA’ DI {ownerCity}"),
        ("C.I.", "{ownerIdType}"),
        (" 15/03/1980", " {ownerBirthDate}"),
        ("11:48", "{personDeathTime}"),
        # Mixed run: company name and its seat in the same `<w:t>`.
        ("CENTRO SERVIZI ELISEO sita in SAN SEVERO",
         "{ownerCompanyName} sita in {ownerCompanyCity}"),
        # The capacity is literal, only the original's stray double spaces go.
        (" in qualità di  delegato del trasporto,  dalla Ditta Onoranze Funebri ",
         " in qualità di delegato del trasporto, dalla Ditta Onoranze Funebri "),
        # "resa dalla moglie" splits as "resa da" + "lla moglie". The relative
        # carries its own article, and the preposition has to agree with it
        # ("dalla moglie", "dal figlio"), so the whole phrase after "resa" is the
        # field: the form asks for "dalla moglie", not "moglie".
        ("Dichiarazione di volontà resa da", "Dichiarazione di volontà resa "),
        ("lla moglie", "{cremationConsentRelative}"),
        # The issuer is stored spelled out ("COMUNE DI SAN SEVERO"), so the
        # literal "dal Comune di" before it would print twice.
        (" rilasciata dal Comune di ", " rilasciato da "),
        ("PERILLO CARRINO", "{ownerDriverName}"),
        ("San Severo, lì ", "{ownerCityName}, lì "),
    ],
    "9": [
        ("CITTA’ DI SAN SEVERO", "CITTA’ DI {ownerCity}"),
        ("Comune di SAN SEVERO", "Comune di {ownerCity}"),
        ("15/03/1980", "{ownerBirthDate}"),
        # Municipality and province share a single run in this document.
        ("CENTRO SERVIZI ELISEO di ROSSI MARIO F.",
         "{ownerCompanyName} di {ownerLastName} {ownerFirstName}"),
        ("PERILLO DANIELE", "{ownerDriverName}"),
        ("San Severo, lì ", "{ownerCityName}, lì "),
        ("     San Severo, ", "     {ownerCityName}, "),
    ],
}

# "SAN SEVERO", "SERRACAPRIOLA", "FOGGIA" and "(FG)" each mean something
# different every time they appear, so the ambiguous runs are addressed by their
# index. The expected content is checked before writing: if an index ever drifts
# the script stops instead of quietly putting the crematorium where the birth
# municipality goes.
BY_INDEX = {
    "8": {
        24: ("Al del Comune di ", "Al Comune di "),   # typo in the original
        25: ("SAN SEVERO", "{ownerCity}"),
        30: (" SAN SEVERO ", " {ownerBirthCity} "),   # dichiarante: nato a
        31: (" (FG)", " ({ownerBirthProvince})"),
        35: ("San Severo", "{ownerCompanyCity}"),     # dichiarante: residente a
        36: (" (FG)", " ({ownerCompanyProvince})"),
        44: ("SAN SEVERO", "{ownerIdIssuer}"),        # documento: rilasciato dal Comune di
        # The issuer is free text ("COMUNE DI SAN SEVERO"), so there is no
        # municipality to derive a province from: the brackets go.
        45: (" (FG) in data ", " in data "),
        52: (" (FG)", " ({ownerCompanyProvince})"),   # sede della ditta
        91: ("SERRACAPRIOLA", "{personBirthCity}"),   # defunto: nato a
        93: ("FG", "{personBirthProvince}"),
        98: ("SERRACAPRIOLA", "{personResidenceCity}"),
        100: ("FG", "{personResidenceProvince}"),
        106: ("_", ""),                               # underscore before the tax code
        110: ("SAN SEVERO", "{personDeathCity}"),     # comune del decesso
        112: ("FG", "{personDeathProvince}"),
        120: ("SAN SEVERO", "{ownerCityName}"),       # partenza del trasporto
        122: ("FG", "{ownerCompanyProvince}"),
        125: ("FOGGIA", "{crematoryCity}"),
        127: ("SERRACAPRIOLA", "{funeralStopCity}"),  # sosta per le esequie
        129: ("FG", "{funeralStopProvince}"),
        132: ("CENTRO SERVIZI ELISEO", "{ownerCompanyName}"),
        149: ("FOGGIA", "{crematoryCity}"),
        151: ("SERRACAPRIOLA", "{ashesCity}"),
        152: (" (FG)", " ({ashesProvince})"),
        # "Seppellimento nel Cimitero comunale di X (FG)": the municipality
        # only, the wording already says which cemetery.
        161: ("SERRACAPRIOLA", "{ashesCity}"),
        163: ("FG", "{ashesProvince}"),
    },
    "9": {
        31: ("San Severo (FG)", "{ownerBirthCity} ({ownerBirthProvince})"),
        35: ("italiana", "{ownerCitizenship}"),
        38: ("San Severo (FG)", "{ownerCompanyCity} ({ownerCompanyProvince})"),
        59: ("SERRACAPRIOLA", "{personBirthCity}"),
        61: ("FG", "{personBirthProvince}"),
        69: ("SERRACAPRIOLA", "{personResidenceCity}"),
        71: ("FG", "{personResidenceProvince}"),
        # The address field carries its own "Via", as it does for the declarant.
        72: (") in Via ", ") in "),
        79: ("San Severo (FG)", "{personDeathCity} ({personDeathProvince})"),
        95: (", come sopra generalizzato, dal Comune di San Severo (FG) al crematorio sito nel Comune di ",
             ", come sopra generalizzato, dal Comune di {ownerCityName} ({ownerCompanyProvince}) al crematorio sito nel Comune di "),
        96: ("FOGGIA", "{crematoryCity}"),
        98: ("FG", "{crematoryProvince}"),
        101: (" SERRACAPRIOLA", " {funeralStopCity}"),   # sosta per le esequie
        103: ("FG", "{funeralStopProvince}"),
        108: ("SAN SEVERO", "{ownerCompanyCity}"),       # sede legale dell'impresa
        109: (" (FG), ", " ({ownerCompanyProvince}), "),
        163: ("FOGGIA", "{crematoryCity}"),
        165: ("FG", "{crematoryProvince}"),
        168: ("SERRACAPRIOLA", "{ashesCity}"),
        170: ("FG", "{ashesProvince}"),
    },
}

WT_RE = re.compile(r"(<w:t(?: [^>]*)?>)([\s\S]*?)(</w:t>)")


def texts(xml: str):
    """Every `<w:t>` content, in document order."""
    return [m.group(2) for m in WT_RE.finditer(xml)]


def replace_by_index(xml: str, mapping: dict) -> str:
    """Replaces specific `<w:t>` runs, verifying what each one holds first."""
    index = [0]

    def repl(m):
        i = index[0]
        index[0] += 1
        if i in mapping:
            expected, replacement = mapping[i]
            if m.group(2) != expected:
                raise SystemExit(
                    f"run {i}: atteso {expected!r}, trovato {m.group(2)!r}. "
                    "Il template e' cambiato: ricontrolla gli indici."
                )
            return m.group(1) + replacement + m.group(3)
        return m.group(0)

    return WT_RE.sub(repl, xml)


def replace_exact(xml: str, pairs) -> str:
    """Replaces whole `<w:t>` contents."""
    def repl(m):
        body = m.group(2)
        for frm, to in pairs:
            if body == frm:
                return m.group(1) + to + m.group(3)
        return m.group(0)

    return WT_RE.sub(repl, xml)


def join_split(xml: str, pieces: list, replacement: str) -> str:
    """Collapses a value Word split over consecutive runs into one placeholder."""
    all_texts = texts(xml)
    for start in range(len(all_texts) - len(pieces) + 1):
        if all_texts[start:start + len(pieces)] == pieces:
            index = [0]

            def repl(m):
                i = index[0]
                index[0] += 1
                if i == start:
                    return m.group(1) + replacement + m.group(3)
                if start < i < start + len(pieces):
                    return m.group(1) + m.group(3)
                return m.group(0)

            return WT_RE.sub(repl, xml)
    print(f"  [WARN] sequenza non trovata: {pieces}")
    return xml


def process(doc_id: str) -> set:
    src = TEMPLATES / f"{doc_id}.docx"
    backup = TEMPLATES / "_backup" / f"{doc_id}.docx"
    with zipfile.ZipFile(backup) as z:
        names = z.namelist()
        data = {n: z.read(n) for n in names}

    xml = data["word/document.xml"].decode("utf-8")

    # By index first, while the run positions still match the original: the
    # collapsing below removes runs and shifts everything after them.
    xml = replace_by_index(xml, BY_INDEX[doc_id])

    for pieces, replacement in SPLIT[doc_id]:
        xml = join_split(xml, pieces, replacement)

    xml = replace_exact(xml, PER_DOC[doc_id])
    xml = replace_exact(xml, COMMON)

    data["word/document.xml"] = xml.encode("utf-8")

    tmp = src.with_suffix(".docx.tmp")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        for n in names:
            z.writestr(n, data[n])
    shutil.move(tmp, src)

    visible = "".join(texts(xml))
    fields = set(re.findall(r"\{([^{}]+)\}", visible))
    print(f"== {doc_id}.docx: {len(fields)} campi")
    print("  ", sorted(fields))
    return fields


if __name__ == "__main__":
    allf = set()
    for d in ("8", "9"):
        allf |= process(d)
    print(f"\n=== {len(allf)} campi in totale ===")
    for f in sorted(allf):
        print(" -", f)
