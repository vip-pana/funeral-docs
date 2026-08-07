/**
 * Verifica che i placeholder nei .docx e la lista in src/lib/fields.ts
 * coincidano.
 *
 * Un campo rinominato solo da una parte non produce errori a runtime: il
 * documento esce con un buco al posto del dato. Questo controllo trasforma quel
 * silenzio in un fallimento.
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
    // Solo il testo visibile: il resto dell'XML contiene graffe che non sono
    // placeholder.
    // `[\s\S]` invece del flag `s`: il testo puo' contenere a capo.
    const text = [...xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
      .map((m) => m[1])
      .join("");
    for (const m of text.matchAll(/\{([^{}]+)\}/g)) found.add(m[1].trim());

    // Le quadre erano la vecchia sintassi: se ne resta una, il template non e'
    // stato normalizzato.
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
