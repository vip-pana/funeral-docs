#!/usr/bin/env python3
"""Turns the two L.R. 34/2008 attachments into templates.

Allegato 2 (6.docx) and Allegato 3 (7.docx) arrived as forms already filled in
with a real person's data, not as templates. Unlike 1-5 they contain no
`[field]` placeholder to rename, so `normalize-templates.py` has nothing to work
on: the values have to be substituted by hand.

Substitution happens one `<w:t>` at a time rather than one sentence at a time.
The data is in bold and the surrounding text is not, so Word keeps them in
separate runs that cannot be merged — a whole sentence is never contiguous in
the XML, but each value is.

Reads from templates/_backup/, writes templates/{6,7}.docx. Idempotent.
"""
import re
import shutil
import zipfile
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"

# Exact `<w:t>` contents -> replacement. Order matters only where one string is a
# prefix of another, which is why the longer forms come first.
COMMON = [
    # Declarant: fixed company data, from Impostazioni.
    ("DANTE", "{ownerFirstName}"),
    (" FRANCESCO", " {ownerMiddleName}"),
    (" ROSSI", " {ownerLastName}"),
    ("15/03/1980", "{ownerBirthDate}"),
    # Street and number are one field, as they are for the deceased, so the
    # literal " in via " goes too: it printed "in via Via Giuseppe Verdi 12". The
    # orphaned " n°" after it is removed by index — the same string is also the
    # label of the identity document number, which must stay.
    (" in via ", " in "),
    ("SOCCORSO", "{ownerAddress}"),
    ("159", ""),
    ("71016", "{ownerPostalCode}"),
    ("CARTA D’IDENTITA", "{ownerIdType}"),
    ("AA1234567", "{ownerIdNumber}"),
    ("COMUNE DI SAN SEVERO", "{ownerIdIssuer}"),
    ("10/06/2020", "{ownerIdDate}"),
    # The deceased.
    ("ANNA BIANCHI", "{personFirstName} {personLastName}"),
    ("BNCNNA39E52H501C", "{personTaxCode}"),
    ("05:38", "{personDeathTime}"),
    ("ABITAZIONE", "{personDeathPlace}"),
]

# Values Word split across several runs: the pieces are joined into the first
# one and the rest emptied, so "12" "/" "05" "/19" "39" becomes one placeholder.
SPLIT = {
    "6": [
        # birth date 12/05/1939
        (["04", "/", "05", "/19", "39"], "{personBirthDate}"),
        # death date 20/07/2026
        (["20", "/", "07", "/2026"], "{personDeathDate}"),
        # today 21/07/2026
        (["21", "/", "07", "/2026"], "{todayDate}"),
        # cemetery "CIMITERO DI SAN SEVERO."
        # The leading space belongs to the sentence, not to the value: it has to
        # be written back, because the whole first run is overwritten.
        ([" CIMITERO", " DI ", "SAN ", "SEVERO."], " {destinationCemetery}."),
        # "VIA DELLE ROSE n° 4": street and number are one field, so the literal
        # "VIA" and "n°" go too — the value carries its own.
        (["VIA", " DELLE ROSE", " ", "n°", " ", "27"], "{personResidenceAddress}"),
    ],
    "7": [
        (["04", "/", "05", "/19", "39"], "{personBirthDate}"),
        (["20", "/07/2026"], "{personDeathDate}"),
        (["21", "/", "07", "/2026"], "{todayDate}"),
        (["VIA", " DELLE ROSE", " ", "n°", " ", "27"], "{personResidenceAddress}"),
        (["ROSSI MARIO", " FRANCESCO"], "{ownerDriverName}"),
        (["NERI PAOLO", ", ", "GALLI LUCA, CARLO FERRARI",
          ", CONTI MARCO"], "{bearerNames}"),
    ],
}

# The heading ("COMUNE DI SAN SEVERO", "CITTA DI SAN SEVERO") and the place
# before the closing date ("San Severo il") stay literal: both forms are always
# issued by San Severo, whatever the client's municipality.
PER_DOC = {
    "6": [
        # The province is only printed in this form as a literal "(FG)".
        ("FG", "{personBirthProvince}"),
    ],
    "7": [
        ("UFFIO STATO CIVILE", "UFFICIO STATO CIVILE"),  # typo in the original
        # "INCARICATO" stays literal: the capacity never changes between records.
        ("CENTRO SERVIZI ELISEO", "{ownerCompanyName}"),
        ("FY363SA", "{ownerVehiclePlate}"),
    ],
}

# "SAN SEVERO" means a different thing each time it appears, so the ambiguous
# runs are addressed by their index. The expected current content is given
# alongside and checked before writing: if an index ever drifts the script stops
# instead of quietly putting the birth municipality where the death one goes.
BY_INDEX = {
    "6": {
        20: ("SAN SEVERO", "{ownerBirthCity}"),        # dichiarante: nato a
        24: ("SAN SEVERO", "{ownerCompanyCity}"),      # dichiarante: residente a
        27: (" n°", ""),                               # civico: gia' in ownerAddress
        59: ("SAN SEVERO", "{personBirthCity}"),       # defunto: nato a
        65: ("SAN SEVERO", "{personResidenceCity}"),   # defunto: residente in vita
        80: ("SAN SEVERO", "{personDeathCity}"),       # defunto: comune del decesso
    },
    "7": {
        19: ("SAN SEVERO", "{ownerBirthCity}"),
        23: ("SAN SEVERO", "{ownerCompanyCity}"),
        26: (" n°", ""),                               # civico: gia' in ownerAddress
        59: ("SAN SEVERO (FG)", "{personBirthCity} ({personBirthProvince})"),
        61: ("SAN SEVERO", "{personResidenceCity}"),
        76: ("SAN SEVERO", "{personDeathCity}"),
        92: ("CIMITERO DI SAN SEVERO", "{destinationCemetery}"),
        97: ("SAN SEVERO", "{ownerCompanyCity}"),      # sede dell'impresa
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
    """Replaces whole `<w:t>` contents, and substrings for the mixed runs."""
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
    for d in ("6", "7"):
        allf |= process(d)
    print(f"\n=== {len(allf)} campi in totale ===")
    for f in sorted(allf):
        print(" -", f)
