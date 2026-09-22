#!/usr/bin/env python3
"""Builds src/lib/data/stati.json: the foreign states, with their cadastral code.

Someone born abroad has a tax code whose four middle characters are the code of
their country of birth rather than of a municipality — Z112 for Germany, Z404
for the United States. Without those codes the birth place cannot be picked from
the list, the tax code cannot be computed, and a pasted one fills nothing in.

There is no single clean source. The Agenzia delle Entrate publishes the
authoritative list only inside a self-extracting archive, so this script merges
the two public ones and says where each part comes from:

  * the coverage and the codes come from the official table reproduced at
    arcrealestate.it (270 states, ceased ones included);
  * the names come from pmontrasio/codici-stati, which spells them properly.
    Where it has no entry the table's own name is cleaned up and used.

Both are needed. The table alone loses the accents and splits the last letter of
a name off ("CECOSLOVACCHI A"); the JSON alone is missing 50 states, among them
the USSR and Czechoslovakia — the very ones an elderly deceased was born in.

Neither source states a licence. What is copied is codes and denominations
produced by the Agenzia delle Entrate: facts, not authorship.

    python3 scripts/build-stati.py

Writes [name, code, ceased] tuples, matching the shape of comuni.json. Run it
again only to refresh the data; the result is committed.
"""
import json
import re
import sys
import unicodedata
import urllib.request
import zlib
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "lib" / "data"

TABLE_URL = "https://www.arcrealestate.it/arc_group_intranet/tabella_stati_esteri.pdf"
NAMES_URL = "https://raw.githubusercontent.com/pmontrasio/codici-stati/master/dist/countries.json"

# Rows read as "Z11200 GERMANIA REPUBBLICA FEDERAL E EE Z112": the ISTAT code,
# the name, the province ("EE" for every foreign state) and the cadastral code.
ROW_RE = re.compile(r"Z\d{5}\s+(.*?)\s+EE\s+(Z\d{3})")

# States that ceased to exist. Their codes stay valid in the tax codes already
# issued, and someone born in Yugoslavia in 1960 carries one on their health
# card — but nobody looking for "Serbia" wants to be offered them first, so they
# are marked and the search sends them to the bottom.
CEASED = {
    "Z105",  # Cecoslovacchia
    "Z111",  # Germania Repubblica Democratica
    "Z118",  # Iugoslavia
    "Z135",  # URSS
    "Z201",  # Arabia Meridionale Federazione
    "Z202",  # Arabia Meridionale Protettorato
    "Z238",  # Ryukyu (isole)
    "Z239",  # Sikkim
    "Z244",  # Vietnam del Sud
    "Z245",  # Vietnam del Nord
    "Z303",  # Basutoland
    "Z304",  # Beciuania
    "Z323",  # Ifni
    "Z339",  # Sahara Spagnolo
    "Z346",  # Somalia Francese
    "Z350",  # Tanganica
    "Z356",  # Zanzibar
    "Z364",  # Bophuthatswana
    "Z367",  # Ciskei
    "Z501",  # Antille Olandesi
    "Z517",  # Panama, zona del canale
    "Z707",  # Irian Occidentale
    "Z717",  # Nuove Ebridi
    "Z718",  # Nuova Guinea
    "Z720",  # Papuasia
}


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def pdf_text(data: bytes) -> str:
    """The table's text, out of the PDF's compressed streams.

    No external tool: the file is a plain sequence of Flate streams whose text
    sits in parentheses, which is enough for a table of this shape.
    """
    chunks = []
    for match in re.finditer(rb"stream\r?\n(.*?)endstream", data, re.S):
        try:
            chunks.append(zlib.decompress(match.group(1)).decode("latin-1"))
        except zlib.error:
            continue  # not a Flate stream: images, fonts
    return " ".join(re.findall(r"\((.*?)\)", "".join(chunks)))


def clean_name(raw: str) -> str:
    """Repairs what the extraction does to a name.

    A closing bracket arrives escaped and loses its ")" — "COCOS \\( ISOLE \\" —
    and the last letter of a word is often split off, "CECOSLOVACCHI A", because
    the PDF positions it separately.
    """
    name = raw.replace("\\(", "(").strip()
    if name.endswith("\\"):
        name = name[:-1].rstrip() + ")"
    name = name.replace("\\", "")
    name = re.sub(r"\s+", " ", name).strip()
    name = re.sub(r"(?<=[A-Z]) (?=[A-Z]$)", "", name)
    # "( ISOLE )" -> "(ISOLE)"
    name = re.sub(r"\(\s+", "(", name)
    return re.sub(r"\s+\)", ")", name)


# Names the sources spell in a way nobody would type or read. The key is the
# cadastral code, so a change of spelling upstream cannot silently undo them.
OVERRIDES = {
    "Z135": "URSS",
    "Z114": "Regno Unito",
    "Z404": "Stati Uniti d'America",
    "Z217": "Taiwan",
    "Z106": "Città del Vaticano",
    "Z611": "Perù",
    "Z516": "Panamá",
}


def title_case(name: str) -> str:
    """Both sources shout. The list sits beside municipalities, which do not.

    Short link words stay lowercase, and a word already holding a capital in the
    middle is left alone: "S.A.R." and "Cote D'Ivoire" must not become "S.a.r.".
    """
    small = {"di", "del", "della", "dei", "delle", "e", "o", "da", "in", "al"}
    words = []
    for index, word in enumerate(name.split(" ")):
        lower = word.lower()
        if index and lower in small:
            words.append(lower)
        elif word.isupper() and len(word.strip(".")) <= 3 and "." in word:
            words.append(word)  # an abbreviation: "S.A.R.", "GR. BRET."
        else:
            # capitalize() alone lowercases the rest of an already-mixed word,
            # and splits nothing on the hyphens and apostrophes these names use.
            words.append(
                re.sub(
                    r"[A-Za-zÀ-ÿ]+",
                    lambda m: m.group(0).capitalize(),
                    lower,
                )
            )
    return " ".join(words)


def main() -> None:
    print(f"scarico {TABLE_URL}")
    table = pdf_text(fetch(TABLE_URL))
    states: dict[str, str] = {}
    for raw, code in ROW_RE.findall(table):
        states.setdefault(code, clean_name(raw))
    if len(states) < 250:
        raise SystemExit(
            f"solo {len(states)} stati estratti dalla tabella: il PDF e' cambiato."
        )
    print(f"  {len(states)} stati")

    print(f"scarico {NAMES_URL}")
    names = {}
    for entry in json.loads(fetch(NAMES_URL)).values():
        code = entry.get("taxcode_country_code")
        name = entry.get("italian_country_name_1")
        if code and name:
            names.setdefault(code, name.strip())
    print(f"  {len(names)} denominazioni")

    rows = []
    for code, fallback in states.items():
        name = OVERRIDES.get(code) or title_case(names.get(code, fallback))
        rows.append([name, code, 1 if code in CEASED else 0])

    # Sorted by name, ignoring accents, as the municipalities are: the search
    # walks the list in order and a stable order keeps its results predictable.
    def key(row):
        stripped = unicodedata.normalize("NFD", row[0])
        return "".join(c for c in stripped if not unicodedata.combining(c)).lower()

    rows.sort(key=key)

    missing = sorted(set(CEASED) - set(states))
    if missing:
        raise SystemExit(f"codici cessati assenti dalla tabella: {missing}")

    only_names = sorted(set(names) - set(states))
    if only_names:
        print(f"\nnel JSON ma non nella tabella, ignorati: {', '.join(only_names)}")

    target = DATA / "stati.json"
    target.write_text(json.dumps(rows, ensure_ascii=False) + "\n", encoding="utf-8")
    ceased = sum(1 for r in rows if r[2])
    print(f"\n✓ {target.relative_to(DATA.parent.parent.parent)}: "
          f"{len(rows)} stati, di cui {ceased} cessati")


if __name__ == "__main__":
    sys.exit(main())
