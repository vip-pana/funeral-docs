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

/**
 * Years completed between two ISO dates, as document 10 prints them ("di anni
 * 81"). Derived rather than typed, so it cannot contradict the two dates it
 * comes from; empty whenever either one is missing or malformed, which is what
 * every practice that does not print document 10 holds.
 */
export function ageAt(birthIso: string, deathIso: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const birth = iso.exec(birthIso.trim());
  const death = iso.exec(deathIso.trim());
  if (!birth || !death) return "";

  const [, by, bm, bd] = birth.map(Number);
  const [, dy, dm, dd] = death.map(Number);

  // Comparing month and day as one number avoids a Date round trip and the
  // timezone questions that come with it.
  let years = dy - by;
  if (dm * 100 + dd < bm * 100 + bd) years -= 1;

  // A death before the birth is data entry gone wrong: print nothing rather
  // than a negative age on an official document.
  return years < 0 ? "" : String(years);
}

const DATE_FIELDS = new Set<TemplateField>([
  "personBirthDate",
  "personDeathDate",
  "transportDate",
  "transportPermitDate",
  "ownerRequestDate",
  "todayDate",
  // Declarant, documents 6 and 7.
  "ownerBirthDate",
  "ownerIdDate",
  // Cremation, document 8.
  "burialPermitDate",
  // The mandate, document 10. The spouse's birth date appears once per branch
  // of the marital status, so each of the three needs converting.
  "mandateBirthDate",
  "marriageDate",
  "marriedSpouseBirthDate",
  "separationDate",
  "separatedSpouseBirthDate",
  "widowedSpouseDeathDate",
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

/**
 * Readable file name, ending with the title shown in the generate panel:
 * COGNOME_Nome_2026-08-06_1_Comunicazione-di-autorizzazione-al-trasporto.docx
 */
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
  const title = slug(DOCUMENTS.find((d) => d.id === documentId)?.title ?? "");

  return (
    [last, first, date, documentId, title].filter(Boolean).join("_") + ".docx"
  );
}

// No archiving helper on purpose: the page downloads the documents one by
// one, each as a standalone .docx.
