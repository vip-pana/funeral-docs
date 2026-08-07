import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Dates are stored as ISO text (yyyy-mm-dd) and times as hh:mm: SQLite has no
 * date type, and ISO text sorts correctly on its own. Italian formatting
 * happens only when generating the documents.
 */

/**
 * Single-row table: `id` is always 1, so saving again updates the existing row
 * instead of piling up parallel configurations.
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

/** Declared before `practices`, which references it. */
export const vehicles = sqliteTable("vehicles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Free-form description to recognise the vehicle, e.g. "Mercedes Vito". */
  name: text("name").notNull(),
  plate: text("plate").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const practices = sqliteTable("practices", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  personFirstName: text("person_first_name").notNull(),
  personLastName: text("person_last_name").notNull(),
  // Feeds the tax code computation, where women get +40 on the birth day.
  // Never appears in any document.
  personSex: text("person_sex", { enum: ["M", "F"] }).notNull().default("M"),
  personTaxCode: text("person_tax_code").notNull(),
  personBirthDate: text("person_birth_date").notNull(),
  personBirthCity: text("person_birth_city").notNull(),
  personResidenceCity: text("person_residence_city").notNull(),
  personResidenceAddress: text("person_residence_address").notNull(),

  personDeathDate: text("person_death_date").notNull(),
  personDeathTime: text("person_death_time").notNull(),
  personDeathCity: text("person_death_city").notNull(),
  personDeathPlace: text("person_death_place").notNull(),

  transportDate: text("transport_date").notNull(),
  transportTime: text("transport_time").notNull(),
  transportPermitDate: text("transport_permit_date").notNull(),
  funeralChurch: text("funeral_church").notNull().default(""),

  // The reference records which vehicle was used and nulls itself out if that
  // vehicle is deleted; the plate is copied because documents already issued
  // must not change when the hearse list does.
  vehicleId: integer("vehicle_id").references(() => vehicles.id, {
    onDelete: "set null",
  }),
  vehiclePlate: text("vehicle_plate").notNull().default(""),

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
