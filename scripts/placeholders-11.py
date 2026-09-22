#!/usr/bin/env python3
"""Turns the transport authorisation form of art. 10bis into a template.

The form required by L.R. 34/2008 art. 10bis c.1 arrived filled in with a real
person's data, like the two attachments and the two cremation forms before it:
there is no `[field]` placeholder to rename, so every value has to be
substituted by hand.

The document holds two halves of the same act on one sheet: the request the
undertaker submits, and the authorisation the registrar grants underneath. The
second repeats the data of the first, so most values appear twice and are
replaced in both places.

Word split the values mid-word (`'i'` + `'l 04/10/2026'`, `'ittadinanz'` +
`'a Italiana '`) because the data is bold and the fixed text is not, which
leaves them in runs that genuinely differ: merging them first, as
normalize-templates.py does for documents 1-5, changes nothing here. The runs
are therefore addressed by index, and what each one holds is checked before it
is written — if the document is ever reflowed the indices drift and the script
stops instead of putting the tax code where the phone number goes.

`Prot. n.` stays literal: the registrar writes it, as in every other form.

Reads from templates/_backup/11.docx, writes templates/11.docx. Idempotent.
"""
import re
import shutil
import zipfile
from pathlib import Path

# Relative to this file, so the script runs from any checkout.
TEMPLATES = Path(__file__).resolve().parent.parent / "templates"
PART = "word/document.xml"

WT_RE = re.compile(r"(<w:t(?: [^>]*)?>)([\s\S]*?)(</w:t>)")

# Run index -> (expected content, replacement). The expected side is what the
# filled-in original holds; a mismatch aborts the run.
#
# Several runs carry a fragment of the fixed text glued to the start or end of a
# value ("ittadinanz" + "a Italiana "). The split is kept where it is and the
# fixed part is written back unchanged, so the formatting of the original —
# bold on the data, regular on the labels — survives.
BY_INDEX = {
    # --- Heading: the municipality the request is addressed to. It is where
    # the death occurred and where the transport starts, so it follows the
    # practice rather than being fixed to one town.
    39: ("Torremaggiore", "{personDeathCity}"),

    # --- The applicant: the client's declarant, already recorded in full.
    41: (" Panacciulli Dante ", " {ownerFirstName} {ownerLastName} "),
    43: (" San Severo ", " {ownerBirthCity} "),
    45: ("l 04/10/2026", "l {ownerBirthDate}"),
    47: (" San Severo ", " {ownerCompanyCity} "),
    # The address carries its own "Via"/"Viale", as in documents 6 and 7, so
    # the fixed "in via" of the form would print it twice.
    48: ("in vi", "in "),
    49: ("a Soccorso n", "{ownerAddress}"),
    # The street number travels with the address, which carries its own. The
    # space before "Documento" lived in this fragment, so it is kept.
    50: (".", ""),
    51: ("159 D", " D"),
    53: ("o C.I. n. CA15777CS r", "o {ownerIdType} n. {ownerIdNumber} r"),
    55: (
        "a Comune di San Severo il 21/11/2018 i",
        "a {ownerIdIssuer} il {ownerIdDate} i",
    ),
    # "in qualità di Incaricato" is the fixed capacity of whoever files the
    # request on behalf of the firm, not a field.

    # --- The deceased.
    81: ("e DE BIASE CARMELA n", "e {personLastName} {personFirstName} n"),
    83: (" San Severo i", " {personBirthCity} i"),
    85: ("01/02/1946 c", "{personBirthDate} c"),
    87: ("a Italiana ", "a {personCitizenship} "),
    89: ("DBSCML46B41I158Y ", "{personTaxCode} "),
    91: ("San Severo ", "{personResidenceCity} "),
    92: ("in via ", "in "),
    93: ("Leoncavallo n.82.", "{personResidenceAddress}."),

    # --- The death.
    96: (" Torremaggiore ", " {personDeathCity} "),
    98: ("15/09/2026 ", "{personDeathDate} "),
    100: ("e 19:50", "e {personDeathTime}"),

    # --- The route and the stop for the funeral service.
    102: ("a Torremaggiore ", "a {personDeathCity} "),
    104: (" San Severo ", " {destinationCity} "),
    106: ("i Sacra Famiglia", "i {funeralChurch}"),
    108: ("San Severo", "{funeralStopCity}"),

    # --- The undertaker, its seat and the hearse.
    111: (" Centro Servizi Eliseo ", " {ownerCompanyName} "),
    113: (" San Severo ", " {ownerCompanyCity} "),
    # The seat's street address, split over three runs by Word ("V" + "ia" +
    # "le 2 Giugno n.264"): the first two are emptied and the whole value goes
    # into the third, since the field carries its own "Via"/"Viale".
    115: ("V", ""),
    116: ("ia", ""),
    117: ("le 2 Giugno n.264", "{ownerCompanyAddress}"),
    120: ("Maserati ", "{ownerVehicleName} "),
    122: (" FY363SC", " {ownerVehiclePlate}"),
    124: (" Panacciulli Dante Francesco", " {ownerDriverName}"),

    # --- Place and date of the request.
    126: ("Torremaggiore,", "{personDeathCity},"),
    130: ("17/09/2026", "{todayDate}"),

    # --- The authorisation granted underneath, repeating the same data.
    # The whole line is in capitals, so the municipality is uppercased for it.
    138: ("TORREMAGGIORE", "{personDeathCityUpper}"),
    167: ("DE BIASE CARMELA ", "{personLastName} {personFirstName} "),
    # The transport date: the request states when it is meant to happen.
    173: ("17/09/2026 ", "{transportDate} "),
    175: (" Torremaggiore ", " {personDeathCity} "),
    178: ("San Severo ", "{destinationCity} "),
    # The stop is the one asked for above: the sample had a different place
    # here, but that is a correction made by hand on the day — the coffin stops
    # once.
    181: ("Casa Funeraria Oltre ", "{funeralChurch} "),
    185: ("Centro Servizi Eliseo", "{ownerCompanyName}"),
    187: ("po Maserati ", "po {ownerVehicleName} "),
    189: ("FY363SC ", "{ownerVehiclePlate} "),
    191: ("Panacciulli Dante Francesco", "{ownerDriverName}"),
    192: ("Torremaggiore,", "{personDeathCity},"),
    196: ("17/09/2026", "{todayDate}"),
}


def replace_by_index(xml: str, mapping: dict) -> str:
    """Replaces specific `<w:t>` runs, verifying what each one holds first."""
    index = [0]
    seen = set()

    def repl(m):
        i = index[0]
        index[0] += 1
        if i not in mapping:
            return m.group(0)
        expected, replacement = mapping[i]
        body = m.group(2)
        # Already converted: the script is meant to be safe to run twice.
        if body == replacement:
            seen.add(i)
            return m.group(0)
        if body != expected:
            raise SystemExit(
                f"run {i}: atteso {expected!r}, trovato {body!r}. "
                "Il template e' cambiato: ricontrolla gli indici."
            )
        seen.add(i)
        return m.group(1) + replacement + m.group(3)

    out = WT_RE.sub(repl, xml)
    missing = sorted(set(mapping) - seen)
    if missing:
        raise SystemExit(
            f"run non raggiunti: {missing}. Il template e' piu' corto del previsto."
        )
    return out


def main() -> None:
    source = TEMPLATES / "_backup" / "11.docx"
    target = TEMPLATES / "11.docx"
    if not source.exists():
        raise SystemExit(f"manca l'originale: {source}")

    with zipfile.ZipFile(source) as zin:
        items = {name: zin.read(name) for name in zin.namelist()}

    xml = items[PART].decode("utf-8")
    xml = replace_by_index(xml, BY_INDEX)
    items[PART] = xml.encode("utf-8")

    tmp = target.with_suffix(".docx.tmp")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, data in items.items():
            zout.writestr(name, data)
    shutil.move(tmp, target)

    # Visible text only, as check-templates.ts does: the document embeds an
    # image whose XML attributes carry GUIDs in braces, and those are not
    # placeholders.
    text = "".join(m.group(2) for m in WT_RE.finditer(xml))
    fields = sorted(set(re.findall(r"\{([^{}]+)\}", text)))
    print(f"✓ {target.name}: {len(fields)} campi")
    for f in fields:
        print(f"    {f}")


if __name__ == "__main__":
    main()
