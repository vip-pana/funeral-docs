import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Le date si memorizzano come testo ISO (yyyy-mm-dd) e le ore come hh:mm:
 * SQLite non ha un tipo data, e il testo ISO si ordina correttamente da solo.
 * La formattazione italiana avviene solo al momento di generare i documenti.
 */

/**
 * Dati della ditta. Riga unica: `id` e' sempre 1, cosi' un secondo salvataggio
 * aggiorna la riga esistente invece di accumulare configurazioni parallele.
 */
export const owner = sqliteTable("owner", {
  id: integer("id").primaryKey().default(1),
  ownerFirstName: text("owner_first_name").notNull(),
  ownerMiddleName: text("owner_middle_name").notNull().default(""),
  ownerLastName: text("owner_last_name").notNull(),
  ownerCompanyName: text("owner_company_name").notNull(),
  ownerCompanyCity: text("owner_company_city").notNull(),
  ownerCity: text("owner_city").notNull(),
  ownerCityName: text("owner_city_name").notNull(),
  ownerDriverName: text("owner_driver_name").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/**
 * Le autofunebri dell'impresa: si sceglie quale usare in ogni pratica.
 * Dichiarata prima di `practices`, che la referenzia.
 */
export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Descrizione libera per riconoscere il mezzo, es. "Mercedes Vito". */
  name: text("name").notNull(),
  plate: text("plate").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** Una pratica = un defunto = una generazione di documenti. */
export const practices = sqliteTable("practices", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // defunto
  personFirstName: text("person_first_name").notNull(),
  personLastName: text("person_last_name").notNull(),
  // Serve a calcolare il codice fiscale: nel giorno di nascita le donne hanno
  // +40. Non compare in nessun documento.
  personSex: text("person_sex", { enum: ["M", "F"] }).notNull().default("M"),
  personTaxCode: text("person_tax_code").notNull(),
  personBirthDate: text("person_birth_date").notNull(),
  personBirthCity: text("person_birth_city").notNull(),
  personResidenceCity: text("person_residence_city").notNull(),
  personResidenceAddress: text("person_residence_address").notNull(),

  // decesso
  personDeathDate: text("person_death_date").notNull(),
  personDeathTime: text("person_death_time").notNull(),
  personDeathCity: text("person_death_city").notNull(),
  personDeathPlace: text("person_death_place").notNull(),

  // trasporto
  transportDate: text("transport_date").notNull(),
  transportTime: text("transport_time").notNull(),
  transportPermitDate: text("transport_permit_date").notNull(),
  funeralChurch: text("funeral_church").notNull().default(""),

  // Il veicolo scelto per il trasporto. Il riferimento dice quale mezzo e'
  // stato usato e si annulla da solo se il veicolo viene eliminato; la targa
  // e' copiata perche' i documenti gia' emessi non devono cambiare quando
  // l'elenco delle autofunebri cambia.
  vehicleId: integer("vehicle_id").references(() => vehicles.id, {
    onDelete: "set null",
  }),
  vehiclePlate: text("vehicle_plate").notNull().default(""),

  // destinazione
  destinationCity: text("destination_city").notNull(),
  destinationProvince: text("destination_province").notNull(),
  destinationCemetery: text("destination_cemetery").notNull(),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Owner = typeof owner.$inferSelect;
export type NewOwner = typeof owner.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Practice = typeof practices.$inferSelect;
export type NewPractice = typeof practices.$inferInsert;
