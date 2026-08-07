import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Dates are stored as ISO text (yyyy-mm-dd) and times as hh:mm: SQLite has no
 * date type, and ISO text sorts correctly on its own. Italian formatting
 * happens only when generating the documents.
 */

/**
 * Primary keys are UUIDs rather than a counter: a sequential id in the URL
 * tells anyone how many records exist and lets them be walked one by one.
 *
 * `$defaultFn` runs in JavaScript before the INSERT, so the id is known in
 * advance and `.returning({ id })` still works. It emits no DEFAULT clause in
 * the DDL, so raw SQL (the migration, scripts/seed.ts) has to supply its own.
 */
const uuid = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());

/**
 * Single-row table: `id` is always 1, so saving again updates the existing row
 * instead of piling up parallel configurations. Deliberately not a UUID — it is
 * a sentinel, not an identity, and the upsert in settings/actions.ts needs a
 * constant to conflict on.
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

  // Required by attachments 2 and 3 of L.R. 34/2008 (documents 6 and 7), which
  // identify the declarant in full. Default to empty so an existing
  // configuration stays valid: the older documents do not use them.
  ownerBirthDate: text("owner_birth_date").notNull().default(""),
  ownerBirthCity: text("owner_birth_city").notNull().default(""),
  /** Street and number together, as for the deceased. */
  ownerAddress: text("owner_address").notNull().default(""),
  ownerPostalCode: text("owner_postal_code").notNull().default(""),
  ownerIdType: text("owner_id_type").notNull().default(""),
  ownerIdNumber: text("owner_id_number").notNull().default(""),
  ownerIdIssuer: text("owner_id_issuer").notNull().default(""),
  ownerIdDate: text("owner_id_date").notNull().default(""),

  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** Declared before `practices`, which references it. */
export const vehicles = sqliteTable("vehicles", {
  id: uuid(),
  /** Free-form description to recognise the vehicle, e.g. "Mercedes Vito". */
  name: text("name").notNull(),
  plate: text("plate").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/** Declared before `practices`, which references it. */
export const drivers = sqliteTable("drivers", {
  id: uuid(),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/**
 * Pallbearers, listed by document 7.
 *
 * No foreign key on the practice side: several are chosen at once, and the names
 * are copied onto the record as one string. A join table would buy nothing —
 * nothing queries the other way round, and the copy is what keeps documents
 * already issued unchanged.
 */
export const bearers = sqliteTable("bearers", {
  id: uuid(),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const practices = sqliteTable("practices", {
  id: uuid(),

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
  vehicleId: text("vehicle_id").references(() => vehicles.id, {
    onDelete: "set null",
  }),
  vehiclePlate: text("vehicle_plate").notNull().default(""),

  // Same split as the vehicle above: the reference nulls itself out if the
  // driver is deleted, the name is copied so documents already issued keep it.
  driverId: text("driver_id").references(() => drivers.id, {
    onDelete: "set null",
  }),
  driverName: text("driver_name").notNull().default(""),

  // Pallbearers, as one comma-separated string. Which ones were picked is kept
  // too, so reopening the record preselects them; the names are what reaches
  // document 7 and they do not change when the list does.
  bearerIds: text("bearer_ids").notNull().default(""),
  bearerNames: text("bearer_names").notNull().default(""),

  /** In what capacity the declarant applies, e.g. "INCARICATO". Document 7. */
  applicantRole: text("applicant_role").notNull().default(""),

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
export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
export type Bearer = typeof bearers.$inferSelect;
export type NewBearer = typeof bearers.$inferInsert;
export type Practice = typeof practices.$inferSelect;
export type NewPractice = typeof practices.$inferInsert;
