/**
 * Checks that the placeholders in the .docx files and the list in
 * src/lib/fields.ts match.
 *
 * A field renamed on only one side raises no runtime error: the document just
 * comes out with a hole where the data should be. This turns that silence into
 * a failure.
 *
 *   pnpm check:templates
 */
import PizZip from "pizzip";
import { readFileSync } from "node:fs";
import path from "node:path";

import { ALL_FIELDS, DOCUMENTS } from "../src/lib/fields";

const TEMPLATES_DIR = process.env.TEMPLATES_DIR ?? path.join(process.cwd(), "templates");
const PARTS = ["word/document.xml", "word/header1.xml", "word/footer1.xml"];

function placeholdersOf(file: string): Set<string> {
  const zip = new PizZip(readFileSync(path.join(TEMPLATES_DIR, file)));
  const found = new Set<string>();

  for (const part of PARTS) {
    const entry = zip.file(part);
    if (!entry) continue;
    const xml = entry.asText();
    // Visible text only: the rest of the XML contains braces that are not
    // placeholders. `[\s\S]` rather than the `s` flag because the text can
    // contain newlines.
    const text = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((m) => m[1])
      .join("");
    for (const m of text.matchAll(/\{([^{}]+)\}/g)) found.add(m[1].trim());

    // Square brackets were the old syntax: any left behind means the template
    // was never normalised.
    const legacy = text.match(/\[[^\[\]]{1,60}\]/g);
    if (legacy) {
      console.error(`  ${file} (${part}): sintassi vecchia rimasta ${legacy.join(", ")}`);
      process.exitCode = 1;
    }
  }
  return found;
}

const known = new Set<string>(ALL_FIELDS);
const used = new Set<string>();
let failed = false;

for (const doc of DOCUMENTS) {
  const found = placeholdersOf(doc.file);
  const unknown = [...found].filter((f) => !known.has(f));

  if (unknown.length) {
    console.error(`✗ ${doc.file}: placeholder non dichiarati in fields.ts → ${unknown.join(", ")}`);
    failed = true;
  } else {
    console.log(`✓ ${doc.file}: ${found.size} campi`);
  }
  found.forEach((f) => used.add(f));
}

const unused = [...known].filter((f) => !used.has(f));
if (unused.length) {
  console.error(`✗ dichiarati in fields.ts ma assenti dai template → ${unused.join(", ")}`);
  failed = true;
}

if (failed || process.exitCode === 1) {
  console.error("\nTemplate e fields.ts non coincidono.");
  process.exit(1);
}
console.log(`\nTutto allineato: ${used.size} campi.`);
