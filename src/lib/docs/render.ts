import Docxtemplater from "docxtemplater";
import { readFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";

import { ALL_FIELDS, DOCUMENTS, type DocumentId, type TemplateField } from "@/lib/fields";

/**
 * Riempimento dei template .docx.
 *
 * I template usano la sintassi `{campo}` di docxtemplater (vedi
 * templates/FIELDS.md). Le date arrivano dal database in ISO e vanno convertite
 * in gg/mm/aaaa qui: e' il formato che i documenti stampano.
 */

/**
 * I template vivono in `templates/`, accanto al codice.
 *
 * L'analisi statica di Next non sa risolvere un percorso composto a runtime e,
 * pur di non sbagliare, tracerebbe l'intero progetto dentro il bundle
 * standalone. `turbopackIgnore` disattiva quel tracing; i .docx entrano
 * comunque nell'output grazie a `outputFileTracingIncludes` in next.config.ts.
 */
function templatePath(file: string): string {
  const dir = process.env.TEMPLATES_DIR ?? path.join(process.cwd(), "templates");
  return path.join(/* turbopackIgnore: true */ dir, file);
}

/** yyyy-mm-dd -> gg/mm/aaaa. Lascia passare invariato tutto il resto. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

/** I campi il cui valore e' una data ISO da convertire. */
const DATE_FIELDS = new Set<TemplateField>([
  "personBirthDate",
  "personDeathDate",
  "transportDate",
  "transportPermitDate",
  "ownerRequestDate",
  "todayDate",
]);

export type FieldValues = Partial<Record<TemplateField, string>>;

/**
 * Prepara i valori per docxtemplater: converte le date e riempie con stringa
 * vuota i campi mancanti — un campo assente lascerebbe il placeholder grezzo
 * nel documento stampato.
 */
export function prepareValues(values: FieldValues): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of ALL_FIELDS) {
    const raw = values[field] ?? "";
    out[field] = DATE_FIELDS.has(field) ? formatDate(raw) : raw;
  }
  return out;
}

/** Riempie un singolo template e restituisce il .docx pronto. */
export async function renderDocument(
  documentId: DocumentId,
  values: FieldValues,
): Promise<Buffer> {
  const doc = DOCUMENTS.find((d) => d.id === documentId);
  if (!doc) throw new Error(`Documento sconosciuto: ${documentId}`);

  const template = await readFile(templatePath(doc.file));
  const zip = new PizZip(template);
  const renderer = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  renderer.render(prepareValues(values));

  return renderer.getZip().generate({ type: "nodebuffer" }) as Buffer;
}

/** Nome file leggibile: COGNOME_Nome_2026-08-06_1.docx */
export function documentFileName(
  values: FieldValues,
  documentId: DocumentId,
): string {
  const slug = (s: string) =>
    s
      .trim()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const last = slug(values.personLastName ?? "").toUpperCase() || "SENZA-NOME";
  const first = slug(values.personFirstName ?? "");
  const date = values.personDeathDate || values.transportDate || "";

  return [last, first, date, documentId].filter(Boolean).join("_") + ".docx";
}

// Nessuna funzione di archiviazione: la pagina scarica i documenti uno per
// uno, ciascuno come .docx a se' stante.
