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

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Data non valida");

const time = z.string().regex(/^\d{2}:\d{2}$/, "Ora non valida (hh:mm)");

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

/**
 * The Select submits an empty string when nothing is picked, and that means
 * "no hearse". Branch order matters: `z.coerce.number()` turns "" into 0,
 * which fails `.positive()` and falls through to the second branch.
 */
const optionalVehicleId = z.coerce
  .number()
  .int()
  .positive()
  .optional()
  .or(z.literal("").transform(() => undefined));

export const ownerSchema = z.object({
  ownerFirstName: requiredText("Nome"),
  ownerMiddleName: optionalText,
  ownerLastName: requiredText("Cognome"),
  ownerCompanyName: requiredText("Ragione sociale"),
  ownerCompanyCity: requiredText("Comune sede"),
  ownerCity: requiredText("Comune autorizzazione"),
  ownerCityName: requiredText("Comune di partenza"),
  ownerDriverName: requiredText("Conducente"),
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
  // The plate does not come from the form: the server copies it from the
  // vehicle, because it ends up in an official document and the client must
  // not be able to write it.
  vehicleId: optionalVehicleId,
  destinationCity: requiredText("Comune di destinazione"),
  destinationProvince: province,
  destinationCemetery: requiredText("Cimitero di destinazione"),
});

export type OwnerInput = z.infer<typeof ownerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
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
