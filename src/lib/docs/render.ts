import Docxtemplater from "docxtemplater";
import { readFile } from "node:fs/promises";
import path from "node:path";
import PizZip from "pizzip";

import { ALL_FIELDS, DOCUMENTS, type DocumentId, type TemplateField } from "@/lib/fields";

/**
 * Templates use docxtemplater's `{field}` syntax (see templates/FIELDS.md).
 * Dates arrive from the database in ISO and are converted to dd/mm/yyyy here,
 * which is what the documents print.
 */

/**
 * Next's static analysis cannot resolve a path composed at runtime and, to
 * stay safe, would trace the whole project into the standalone bundle.
 * `turbopackIgnore` turns that tracing off; the .docx files still reach the
 * output through `outputFileTracingIncludes` in next.config.ts.
 */
function templatePath(file: string): string {
  const dir = process.env.TEMPLATES_DIR ?? path.join(process.cwd(), "templates");
  return path.join(/* turbopackIgnore: true */ dir, file);
}

/** yyyy-mm-dd -> dd/mm/yyyy. Anything else passes through unchanged. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

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
 * Missing fields are filled with an empty string: an absent one would leave
 * the raw placeholder in the printed document.
 */
export function prepareValues(values: FieldValues): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of ALL_FIELDS) {
    const raw = values[field] ?? "";
    out[field] = DATE_FIELDS.has(field) ? formatDate(raw) : raw;
  }
  return out;
}

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

/** Readable file name: COGNOME_Nome_2026-08-06_1.docx */
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

// No archiving helper on purpose: the page downloads the documents one by
// one, each as a standalone .docx.
