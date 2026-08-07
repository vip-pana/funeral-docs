import { z } from "zod";

import { checkChar } from "./tax-code";

/**
 * Validazione dei dati inseriti nel form.
 *
 * Le date si tengono in ISO (yyyy-mm-dd) perche' e' quanto emette
 * `<input type="date">` e quanto SQLite ordina correttamente; la conversione a
 * gg/mm/aaaa avviene solo al momento di riempire i documenti (src/lib/docs).
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
 * Codice fiscale: 6 lettere, 2 cifre, 1 lettera mese, 2 cifre, 1 lettera + 3
 * alfanumerici, 1 carattere di controllo. Le cifre possono essere sostituite da
 * lettere nei codici omocodici, quindi la classe e' volutamente permissiva.
 */
const taxCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/,
    "Codice fiscale non valido",
  )
  // Il carattere di controllo intercetta i refusi di battitura, che la sola
  // forma non distingue da un codice buono.
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

/** Una autofunebre in elenco. */
export const vehicleSchema = z.object({
  name: requiredText("Descrizione"),
  plate,
});

/**
 * Id del veicolo scelto in una pratica.
 *
 * Il Select invia stringa vuota quando non c'e' scelta, e va accettata come
 * "nessuna autofunebre". L'ordine dei due rami conta: `z.coerce.number()`
 * trasforma "" in 0, che fallisce `.positive()` e ricade sul secondo.
 */
const optionalVehicleId = z.coerce
  .number()
  .int()
  .positive()
  .optional()
  .or(z.literal("").transform(() => undefined));

/** Dati della ditta — compilati una volta sola. */
export const ownerSchema = z.object({
  ownerFirstName: requiredText("Nome"),
  ownerMiddleName: optionalText,
  ownerLastName: requiredText("Cognome"),
  ownerCompanyName: requiredText("Ragione sociale"),
  ownerCompanyCity: requiredText("Comune sede"),
  ownerCity: requiredText("Comune autorizzazione"),
  ownerCityName: requiredText("Comune di partenza"),
  ownerDriverName: requiredText("Conducente"),
  // La data della domanda cambia a ogni pratica: si tiene come default
  // modificabile, non come dato fisso della ditta.
  ownerRequestDate: isoDate.optional().or(z.literal("")),
});

/** Dati di una singola pratica. */
export const practiceSchema = z.object({
  // defunto
  personFirstName: requiredText("Nome del defunto"),
  personLastName: requiredText("Cognome del defunto"),
  // Non finisce nei documenti: serve solo a calcolare il codice fiscale.
  personSex: z.enum(["M", "F"]).default("M"),
  personTaxCode: taxCode,
  personBirthDate: isoDate,
  personBirthCity: requiredText("Comune di nascita"),
  personResidenceCity: requiredText("Comune di residenza"),
  personResidenceAddress: requiredText("Indirizzo di residenza"),
  // decesso
  personDeathDate: isoDate,
  personDeathTime: time,
  personDeathCity: requiredText("Comune del decesso"),
  personDeathPlace: requiredText("Luogo del decesso"),
  // trasporto
  transportDate: isoDate,
  transportTime: time,
  transportPermitDate: isoDate,
  funeralChurch: optionalText,
  // La targa non arriva dal form: si copia dal veicolo lato server, perche'
  // finisce in un documento ufficiale e il client non deve poterla scrivere.
  vehicleId: optionalVehicleId,
  // destinazione
  destinationCity: requiredText("Comune di destinazione"),
  destinationProvince: province,
  destinationCemetery: requiredText("Cimitero di destinazione"),
});

export type OwnerInput = z.infer<typeof ownerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type PracticeInput = z.infer<typeof practiceSchema>;

/**
 * Estrae data e comune di nascita dal codice fiscale.
 * Serve a precompilare il form, non a validare: il risultato resta modificabile.
 */
const MONTH_CODES = "ABCDEHLMPRST";
/** Nei codici omocodici alcune cifre diventano lettere. */
const OMOCODIA: Record<string, string> = {
  L: "0", M: "1", N: "2", P: "3", Q: "4",
  R: "5", S: "6", T: "7", U: "8", V: "9",
};

const digits = (s: string) =>
  s.replace(/[LMNPQRSTUV]/g, (c) => OMOCODIA[c] ?? c);

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

  // Il giorno e' maggiorato di 40 per le donne.
  const rawDay = Number(digits(cf.slice(9, 11)));
  const isFemale = rawDay > 40;
  const day = isFemale ? rawDay - 40 : rawDay;
  if (day < 1 || day > 31) return null;

  // Il CF porta solo due cifre d'anno: un anno futuro appartiene al '900.
  const currentYY = new Date().getFullYear() % 100;
  const century = year <= currentYY ? 2000 : 1900;
  const fullYear = century + year;

  const iso = `${fullYear}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Scarta date inesistenti (es. 31 febbraio) che il regex non intercetta.
  const d = new Date(`${iso}T00:00:00Z`);
  if (d.getUTCDate() !== day || d.getUTCMonth() !== monthIndex) return null;

  return { birthDate: iso, isFemale, cadastralCode: cf.slice(11, 15) };
}
