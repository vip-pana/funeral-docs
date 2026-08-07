import { z } from "zod";

import { checkChar } from "./tax-code";

/**
 * Dates are kept in ISO (yyyy-mm-dd): it is what `<input type="date">` emits
 * and what SQLite sorts correctly. Conversion to dd/mm/yyyy happens only when
 * filling the documents (src/lib/docs).
 */

const requiredText = (label: string) =>
  z.string().trim().min(1, `${label}: campo obbligatorio`);

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => v ?? "");

/**
 * `Date.parse` is not enough: V8 accepts "2026-02-31" and rolls it over to
 * 2 March, so a non-existent day would reach the documents printed as
 * 31/02/2026. Comparing the parsed date back to its parts rejects it.
 */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida")
  .refine((v) => {
    const [year, month, day] = v.split("-").map(Number);
    const d = new Date(`${v}T00:00:00Z`);
    return (
      d.getUTCFullYear() === year &&
      d.getUTCMonth() === month - 1 &&
      d.getUTCDate() === day
    );
  }, "Data inesistente");

// The shape alone would accept "99:99": these are departure times written on
// an official document, so the range is checked too.
const time = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Ora non valida (hh:mm)")
  .refine((v) => {
    const [hours, minutes] = v.split(":").map(Number);
    return hours < 24 && minutes < 60;
  }, "Ora inesistente");

/**
 * Digits can be replaced by letters in omocodia variants, so the digit
 * character classes are deliberately permissive.
 */
const taxCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/,
    "Codice fiscale non valido",
  )
  // The check character catches typos, which the shape alone cannot tell
  // apart from a valid code.
  .refine(
    (cf) => checkChar(cf.slice(0, 15)) === cf[15],
    "Codice fiscale non valido: controlla di averlo copiato bene",
  );

const province = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Sigla provincia: 2 lettere (es. FG)");

const plate = z.string().trim().toUpperCase().min(1, "Targa obbligatoria");

export const vehicleSchema = z.object({
  name: requiredText("Descrizione"),
  plate,
});

export const driverSchema = z.object({
  name: requiredText("Nome"),
});

export const bearerSchema = z.object({
  name: requiredText("Nome"),
});

/**
 * Ids are UUIDs, so there is nothing to coerce — but the empty string still has
 * to survive as "none chosen": the Select submits it when nothing is picked, and
 * validating the shape would report an error on a field left blank on purpose.
 *
 * No `.uuid()` either: the server re-reads the row anyway and turns an id that
 * matches nothing into null (see `withSelections`).
 */
const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);

export const ownerSchema = z.object({
  ownerFirstName: requiredText("Nome"),
  ownerMiddleName: optionalText,
  ownerLastName: requiredText("Cognome"),
  ownerCompanyName: requiredText("Ragione sociale"),
  ownerCompanyCity: requiredText("Comune sede"),
  ownerCity: requiredText("Comune autorizzazione"),
  ownerCityName: requiredText("Comune di partenza"),
  // Optional: only documents 6 and 7 use them, and a configuration saved before
  // those existed must stay valid. Documents leave the gap blank instead.
  ownerBirthDate: isoDate.optional().or(z.literal("")),
  ownerBirthCity: optionalText,
  ownerAddress: optionalText,
  ownerPostalCode: optionalText,
  ownerIdType: optionalText,
  ownerIdNumber: optionalText,
  ownerIdIssuer: optionalText,
  ownerIdDate: isoDate.optional().or(z.literal("")),
  // The request date changes with every practice: kept as an editable
  // default rather than fixed company data.
  ownerRequestDate: isoDate.optional().or(z.literal("")),
});

export const practiceSchema = z.object({
  personFirstName: requiredText("Nome del defunto"),
  personLastName: requiredText("Cognome del defunto"),
  // Never printed: only feeds the tax code computation.
  personSex: z.enum(["M", "F"]).default("M"),
  personTaxCode: taxCode,
  personBirthDate: isoDate,
  personBirthCity: requiredText("Comune di nascita"),
  personResidenceCity: requiredText("Comune di residenza"),
  personResidenceAddress: requiredText("Indirizzo di residenza"),
  personDeathDate: isoDate,
  personDeathTime: time,
  personDeathCity: requiredText("Comune del decesso"),
  personDeathPlace: requiredText("Luogo del decesso"),
  transportDate: isoDate,
  transportTime: time,
  transportPermitDate: isoDate,
  funeralChurch: optionalText,
  // Neither the plate nor the driver name comes from the form: the server
  // copies them from the selected rows, because they end up in an official
  // document and the client must not be able to write them.
  vehicleId: optionalId,
  driverId: optionalId,
  /**
   * Several bearers at once, so the form posts one entry per checkbox. The names
   * are not read from here either: the server looks them up by id.
   */
  bearerIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) =>
      (Array.isArray(v) ? v : v ? [v] : []).filter((s) => s.trim()),
    ),
  applicantRole: optionalText,
  destinationCity: requiredText("Comune di destinazione"),
  destinationProvince: province,
  destinationCemetery: requiredText("Cimitero di destinazione"),
});

export type OwnerInput = z.infer<typeof ownerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type DriverInput = z.infer<typeof driverSchema>;
export type BearerInput = z.infer<typeof bearerSchema>;
export type PracticeInput = z.infer<typeof practiceSchema>;

const MONTH_CODES = "ABCDEHLMPRST";
/** In omocodia variants some digits are replaced by letters. */
const OMOCODIA: Record<string, string> = {
  L: "0", M: "1", N: "2", P: "3", Q: "4",
  R: "5", S: "6", T: "7", U: "8", V: "9",
};

const digits = (s: string) =>
  s.replace(/[LMNPQRSTUV]/g, (c) => OMOCODIA[c] ?? c);

/** Prefills the form from a tax code; the result stays editable. */
export function parseTaxCode(code: string): {
  birthDate: string;
  isFemale: boolean;
  cadastralCode: string;
} | null {
  const cf = code.trim().toUpperCase();
  if (!taxCode.safeParse(cf).success) return null;

  const year = Number(digits(cf.slice(6, 8)));
  const monthIndex = MONTH_CODES.indexOf(cf[8]);
  if (monthIndex < 0) return null;

  // Women have 40 added to the birth day.
  const rawDay = Number(digits(cf.slice(9, 11)));
  const isFemale = rawDay > 40;
  const day = isFemale ? rawDay - 40 : rawDay;
  if (day < 1 || day > 31) return null;

  // The code carries only two year digits: a future year belongs to the 1900s.
  const currentYY = new Date().getFullYear() % 100;
  const century = year <= currentYY ? 2000 : 1900;
  const fullYear = century + year;

  const iso = `${fullYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Rejects non-existent dates (e.g. 31 February) that the regex lets through.
  const d = new Date(`${iso}T00:00:00Z`);
  if (d.getUTCDate() !== day || d.getUTCMonth() !== monthIndex) return null;

  return { birthDate: iso, isFemale, cadastralCode: cf.slice(11, 15) };
}
