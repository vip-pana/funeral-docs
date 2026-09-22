#!/usr/bin/env python3
"""Turns the funeral-service mandate into a template.

The form arrived as a blank paper module: every field is a run of underscores,
with no `[field]` placeholder to rename. Unlike documents 6-9 it carries no real
person's data, so there is nothing to recognise by value — the runs are
addressed by their index instead, and what each one holds is checked before it
is written. If Word ever reflows the document the indices drift and the script
stops rather than putting the tax code where the phone number goes.

Word keeps this document's text in whole runs, splitting only on the accented
letters its spellchecker marks (`Paternit` + `à ` + `___________`): the
underscores themselves are never split, so no run merging is needed.

The four `□` of each tick-box group each sit in a run of their own, ahead of
their label, and become a placeholder that prints `☒` or `□` at generation time.

Not every underscore becomes a field. `prepareValues` writes an empty string for
anything not filled in, so a placeholder left empty makes the line vanish
instead of leaving a gap to complete by hand. The footer of the company (licence,
administrative authorisation, VAT, tax code) and the two signature lines stay
literal for that reason, as `Prot. n. ____` does in documents 8 and 9.

Reads from templates/_backup/10.docx, writes templates/10.docx. Idempotent.
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
# blank module holds; a mismatch aborts the run.
BY_INDEX = {
    # The mandator: who signs the mandate, usually a relative of the deceased.
    3: (
        "Il sottoscritto _____________________________  nato il         a ________ e residente in ______________",
        "Il sottoscritto {mandateFirstName} {mandateLastName} nato il {mandateBirthDate} a {mandateBirthCity} e residente in {mandateResidenceCity}",
    ),
    4: (
        "rec. telefonico ___________ cod. fiscale _____________________  documento d",
        "rec. telefonico {mandatePhone} cod. fiscale {mandateTaxCode}  documento d",
    ),
    8: ("tipo __________", "tipo {mandateIdType}"),
    # The capacity ("figlio", "coniuge") and the name of the deceased.
    11: (
        "di ____________________de/della defunto/a: ____________",
        "di {mandateRelationship} de/della defunto/a: {personFirstName} {personLastName}",
    ),
    9: (" n. _______ in qualit", " n. {mandateIdNumber} in qualit"),

    # The deceased. The age is derived from the two dates at generation time.
    12: (
        "Nome e Cognome _____________________________________di anni ___ cittadinanza ______________",
        "Nome e Cognome {personFirstName} {personLastName} di anni {personAge} cittadinanza {personCitizenship}",
    ),
    14: (
        "deceduto/a alle ore ___________del giorno ____________ presso ______________________________",
        "deceduto/a alle ore {personDeathTime} del giorno {personDeathDate} presso {personDeathPlace}",
    ),
    15: (
        " nato/a il _________________________________ a __________________________________________",
        " nato/a il {personBirthDate} a {personBirthCity}",
    ),
    # The deceased's own identity document is not modelled: the practice records
    # the tax code, not a card. Left literal, to be completed by hand.
    # (run 16 untouched)

    # Optional: paternity, maternity, profession.
    19: ("___________ Maternit", "{personFatherName} Maternit"),
    21: (
        "___________ Professione ___________",
        "{personMotherName} Professione {personProfession}",
    ),

    # Marital status: one tick per box. The three branches that name a spouse
    # ask for the same details in the same positions, and the practice stores
    # them once — but each branch needs a placeholder of its own, because the
    # two that were not ticked have to print empty. The generation route fills
    # the chosen branch's set from the single stored group and blanks the rest;
    # a shared placeholder would repeat the spouse's name on all three lines,
    # under boxes that are not ticked.
    23: ("□ ", "{maritalSingleBox} "),
    25: ("                      □ ", "                      {maritalMarriedBox} "),
    26: (
        "Coniugato/a con __________________ il _____________________________",
        "Coniugato/a con {marriedSpouseName} il {marriageDate}",
    ),
    27: (
        "                          nato/a il ____________________ a ____________ residente a _____________",
        "                          nato/a il {marriedSpouseBirthDate} a {marriedSpouseBirthCity} residente a {marriedSpouseResidenceCity}",
    ),
    28: ("                      □ ", "                      {maritalSeparatedBox} "),
    29: (
        "Separato/a legalmente da ______________ il ___________ ",
        "Separato/a legalmente da {separatedSpouseName} il {separationDate} ",
    ),
    # Same sub-line as run 27, under the "Separato/a" branch.
    30: (
        "                          nato/a il ____________________ a ____________ residente a _____________",
        "                          nato/a il {separatedSpouseBirthDate} a {separatedSpouseBirthCity} residente a {separatedSpouseResidenceCity}",
    ),
    31: ("                      □ ", "                      {maritalWidowedBox} "),
    32: (
        "Vedovo di _____________ deceduto/a il ________________ a _____________",
        "Vedovo di {widowedSpouseName} deceduto/a il {widowedSpouseDeathDate} a {widowedSpouseDeathCity}",
    ),

    # The firm is the client the practice was filed under, read live at
    # generation time like everywhere else.
    34: (
        "Incarico la Ditta ____________________ ad espletare le pratiche e ad anticipare, a mio nome e per mio conto, tutte le spese relative all'organizzazione del servizio funebre per la suddetta salma, attenendovi a quanto stabilito nel preventivo richiestoVi. In particolare: ",
        "Incarico la Ditta {ownerCompanyName} ad espletare le pratiche e ad anticipare, a mio nome e per mio conto, tutte le spese relative all'organizzazione del servizio funebre per la suddetta salma, attenendovi a quanto stabilito nel preventivo richiestoVi. In particolare: ",
    ),
    37: (
        "inizio il giorno ____________ alle ore __________ con partenza da ____________ sosta alle ore ________ presso _________________ per svolgimento del rito religioso/civile e destinazione finale al cimitero di ___________________ ",
        "inizio il giorno {transportDate} alle ore {transportTime} con partenza da {transportDeparturePlace} sosta alle ore {funeralStopTime} presso {funeralChurch} per svolgimento del rito religioso/civile e destinazione finale al cimitero di {destinationCemetery} ",
    ),

    # Destination of the body: four exclusive boxes.
    41: ("□ ", "{destBuriedBox} "),
    43: ("□ ", "{destEntombedBox} "),
    46: (
        "esistente (concessione tipo ___________ nr ___________ )",
        "esistente (concessione tipo {concessionType} nr {concessionNumber} )",
    ),
    47: ("□ ", "{destEntombedNewBox} "),
    49: ("□  ", "{destCrematedBox}  "),
    50: (
        "Preventivamente cremata presso l'ara di _______ ",
        "Preventivamente cremata presso l'ara di {crematoryAra} ",
    ),

    # Who the invoice is made out to. Often the mandator, not always.
    52: (
        "Nome e Cognome _________________________________________________________________",
        "Nome e Cognome {billingName}",
    ),
    53: (
        "residente in Via _______________ n. __________ c.a.p. _____ Comune _____________ cod. fiscale ___________________ recapiti telefonici ________________",
        "residente in Via {billingAddress} n. {billingStreetNumber} c.a.p. {billingPostalCode} Comune {billingCity} cod. fiscale {billingTaxCode} recapiti telefonici {billingPhone}",
    ),

    # Place and date of signature.
    54: ("__________ l", "{ownerCityName} l"),
    56: (
        "_____                                                                                                       In fede",
        "{todayDate}                                                                                       In fede",
    ),
    # Runs 59-61 stay literal: the two signature lines, and the company footer
    # (licence, administrative authorisation, VAT, tax code) which the app does
    # not model.
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
        raise SystemExit(f"run non raggiunti: {missing}. Il template e' piu' corto del previsto.")
    return out


def main() -> None:
    source = TEMPLATES / "_backup" / "10.docx"
    target = TEMPLATES / "10.docx"
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

    fields = sorted(set(re.findall(r"\{([^{}]+)\}", xml)))
    print(f"✓ {target.name}: {len(fields)} campi")
    for f in fields:
        print(f"    {f}")


if __name__ == "__main__":
    main()
