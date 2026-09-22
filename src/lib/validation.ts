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

/**
 * A company can be identified by an 11-digit numeric code rather than a
 * person's alphanumeric one, so `taxCode` above is too strict here: it would
 * reject a perfectly valid societa'.
 */
const companyTaxCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (v) => /^\d{11}$/.test(v) || taxCode.safeParse(v).success,
    "Codice fiscale non valido: 11 cifre per una societa', 16 caratteri per una persona",
  );

const vatNumber = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "Partita IVA: 11 cifre");

const postalCode = z
  .string()
  .trim()
  .regex(/^\d{5}$/, "CAP: 5 cifre");

/** Codice univoco / SDI: 6 alphanumeric characters, 7 for a PA office. */
const sdiCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,7}$/, "Codice univoco: 6 o 7 caratteri");

const email = z.email("Indirizzo non valido").trim().toLowerCase();

/**
 * Optional-with-a-shape: an empty field means "not filled in" and must not
 * report a format error, but anything typed is checked. Same trick as
 * `birthDate` below, which pairs `isoDate` with the empty string.
 */
const blankOr = (schema: z.ZodType<string, string>) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => v ?? "")
    .pipe(z.union([z.literal(""), schema]));

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

export const bearerSchema = z.object({
  name: requiredText("Nome"),
  // A checkbox posts "on" when ticked and nothing at all when not, so the
  // absent value has to mean false rather than fail as missing.
  isDriver: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => v === "on" || v === "true"),
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

export const clientSchema = z.object({
  firstName: requiredText("Nome"),
  middleName: optionalText,
  lastName: requiredText("Cognome"),
  companyName: requiredText("Ragione sociale"),
  companyCity: requiredText("Comune sede"),
  city: requiredText("Comune autorizzazione"),
  cityName: requiredText("Comune di partenza"),
  // Optional: only documents 6 and 7 use them, and a client saved before those
  // existed must stay valid. Documents leave the gap blank instead.
  birthDate: isoDate.optional().or(z.literal("")),
  birthCity: optionalText,
  address: optionalText,
  postalCode: optionalText,
  idType: optionalText,
  idNumber: optionalText,
  idIssuer: optionalText,
  idDate: isoDate.optional().or(z.literal("")),
  // Document 9 only. Optional like the fields above, and free text rather than
  // a list: the declarant may not be an Italian citizen.
  citizenship: optionalText,

  // Billing details of the client company. No document prints them, so nothing
  // here is required — but what is typed in is checked, since a wrong VAT number
  // or PEC is worse than a blank one.
  companyVatNumber: blankOr(vatNumber),
  companyTaxCode: blankOr(companyTaxCode),
  companyAddressCity: optionalText,
  companyAddress: optionalText,
  companyPostalCode: blankOr(postalCode),
  companySdiCode: blankOr(sdiCode),
  companyPec: blankOr(email),
  companyEmail: blankOr(email),
});

/**
 * Changing the shared password. Eight characters minimum, as scripts/hash-password.ts
 * already requires: the two must not disagree on what an acceptable password is.
 */
export const passwordSchema = z
  .object({
    currentPassword: requiredText("Password attuale"),
    newPassword: z
      .string()
      .min(8, "La nuova password deve essere di almeno 8 caratteri"),
    confirmPassword: requiredText("Conferma"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Le due password non coincidono",
    // Without an explicit path the issue arrives with an empty one and
    // `collectErrors` files it under "undefined", where no field renders it.
    path: ["confirmPassword"],
  });

export const practiceSchema = z.object({
  // Required, unlike the hearse and the driver: without a client every document
  // comes out with no declarant and no company at all. `requiredText` rather
  // than `optionalId` precisely so an untouched Select, which posts an empty
  // string, is reported as a missing field instead of passing as "none chosen".
  clientId: requiredText("Cliente"),
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
  destinationCity: requiredText("Comune di destinazione"),
  destinationProvince: province,
  destinationCemetery: requiredText("Cimitero di destinazione"),
  // Cremation, documents 8 and 9. All optional: a burial leaves them blank and
  // the other documents do not print them.
  crematoryCity: optionalText,
  funeralStopCity: optionalText,
  ashesCity: optionalText,
  cremationConsentRelative: optionalText,
  burialPermitDate: isoDate.optional().or(z.literal("")),
  personCitizenship: optionalText,

  // Document 10, the mandate the family signs. Nothing here is required: it is
  // one document out of ten, and whoever does not print it must not be stopped
  // from saving. What is typed in is still checked, though — a wrong tax code
  // on a mandate is worse than a blank one.
  mandateFirstName: optionalText,
  mandateLastName: optionalText,
  mandateBirthDate: isoDate.optional().or(z.literal("")),
  mandateBirthCity: optionalText,
  mandateResidenceCity: optionalText,
  mandatePhone: optionalText,
  mandateTaxCode: blankOr(taxCode),
  mandateIdType: optionalText,
  mandateIdNumber: optionalText,
  mandateRelationship: optionalText,

  personFatherName: optionalText,
  personMotherName: optionalText,
  personProfession: optionalText,

  // The empty string is a legal choice: it means the question was not answered.
  personMaritalStatus: z
    .enum(["", "celibe", "coniugato", "separato", "vedovo"])
    .default(""),
  spouseName: optionalText,
  spouseBirthDate: isoDate.optional().or(z.literal("")),
  spouseBirthCity: optionalText,
  spouseResidenceCity: optionalText,
  marriageDate: isoDate.optional().or(z.literal("")),
  separationDate: isoDate.optional().or(z.literal("")),
  widowedSpouseDeathDate: isoDate.optional().or(z.literal("")),
  widowedSpouseDeathCity: optionalText,

  transportDeparturePlace: optionalText,
  funeralStopTime: blankOr(time),

  bodyDestination: z
    .enum(["", "inumata", "tumulata", "tumulataNuova", "cremata"])
    .default(""),
  concessionType: optionalText,
  concessionNumber: optionalText,
  crematoryAra: optionalText,

  billingName: optionalText,
  billingAddress: optionalText,
  billingStreetNumber: optionalText,
  billingPostalCode: blankOr(postalCode),
  billingCity: optionalText,
  // The invoice can be made out to a company, which has an 11-digit code.
  billingTaxCode: blankOr(companyTaxCode),
  billingPhone: optionalText,
});

export type ClientInput = z.infer<typeof clientSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
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
