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
 * The single shared password, as a bcrypt hash.
 *
 * Single-row table: `id` is always 1, a sentinel the upsert conflicts on rather
 * than an identity. It lives here and not in AUTH_PASSWORD_HASH because a
 * running app cannot rewrite its own .env — and under Docker that file is
 * mounted from outside, so the change would not survive a restart either. The
 * environment variable stays as the value this row is seeded from the first
 * time, and is ignored from then on.
 */
export const auth = sqliteTable("auth", {
  id: integer("id").primaryKey().default(1),
  passwordHash: text("password_hash").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

/**
 * Whoever the documents are issued on behalf of: the declarant who signs the
 * applications and the company they run. The two are one row because every
 * document names them together, and each record picks one.
 *
 * It replaces a single-row `owner` table, which allowed one declarant for the
 * whole installation.
 *
 * Declared before `practices`, which references it.
 */
export const clients = sqliteTable("clients", {
  id: uuid(),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name").notNull().default(""),
  lastName: text("last_name").notNull(),
  companyName: text("company_name").notNull(),
  companyCity: text("company_city").notNull(),
  /** The municipality the application is submitted to. */
  city: text("city").notNull(),
  /** Where the coffin leaves from. */
  cityName: text("city_name").notNull(),

  // Required by attachments 2 and 3 of L.R. 34/2008 (documents 6 and 7), which
  // identify the declarant in full. Default to empty because only those
  // documents print them: the older ones leave the gap blank.
  birthDate: text("birth_date").notNull().default(""),
  birthCity: text("birth_city").notNull().default(""),
  /** Street and number together, as for the deceased. */
  address: text("address").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  idType: text("id_type").notNull().default(""),
  idNumber: text("id_number").notNull().default(""),
  idIssuer: text("id_issuer").notNull().default(""),
  idDate: text("id_date").notNull().default(""),

  /** Printed beside the declarant's name by document 9. */
  citizenship: text("citizenship").notNull().default("italiana"),

  // Billing and contact details of the client company. They were added so the
  // office has them at hand rather than for the documents, and `clientValues`
  // still leaves most of them out — `companyAddress` is the exception, named by
  // document 11 beside the municipality. All optional: a client saved before
  // them stays valid. Distinct from `address`/`postalCode` above, which are the
  // declarant's residence and do reach documents 6 and 7.
  companyVatNumber: text("company_vat_number").notNull().default(""),
  companyTaxCode: text("company_tax_code").notNull().default(""),
  companyAddressCity: text("company_address_city").notNull().default(""),
  companyAddress: text("company_address").notNull().default(""),
  companyPostalCode: text("company_postal_code").notNull().default(""),
  /** Codice univoco / SDI, for electronic invoicing. */
  companySdiCode: text("company_sdi_code").notNull().default(""),
  companyPec: text("company_pec").notNull().default(""),
  companyEmail: text("company_email").notNull().default(""),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
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

/**
 * The staff: whoever carries the coffin, listed by document 7, and whoever
 * drives the hearse, named by document 4. One table rather than two, because
 * anyone on the list can potentially do either — a separate `drivers` table
 * only forced the same person to be entered twice.
 *
 * Declared before `practices`, which references it.
 *
 * The bearers picked for a record are not joined but copied onto it as one
 * string: several are chosen at once, nothing queries the other way round, and
 * the copy is what keeps documents already issued unchanged.
 */
export const bearers = sqliteTable("bearers", {
  id: uuid(),
  name: text("name").notNull(),
  /** Whether they can drive the hearse, i.e. whether the practice can pick them. */
  isDriver: integer("is_driver", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const practices = sqliteTable("practices", {
  id: uuid(),

  // On whose behalf the documents are issued. Same split as the vehicle and the
  // driver below: the reference nulls itself out if the client is deleted, and
  // the name is copied so the record stays readable in the list either way.
  // The documents themselves read the client row live, so correcting an address
  // fixes every document reprinted afterwards — unlike the plate and the driver
  // name, which are frozen. A client is required by the form, not by the
  // database: deleting one must not lock the records that used it.
  clientId: text("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  clientName: text("client_name").notNull().default(""),

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
  /**
   * Make and model, as document 11 names it beside the plate. Copied for the
   * same reason the plate is: renaming a hearse in the list must not change the
   * documents already issued.
   */
  vehicleName: text("vehicle_name").notNull().default(""),

  // Same split as the vehicle above: the reference nulls itself out if the
  // driver is deleted, the name is copied so documents already issued keep it.
  // It points at `bearers`, filtered to those flagged as drivers.
  driverId: text("driver_id").references(() => bearers.id, {
    onDelete: "set null",
  }),
  driverName: text("driver_name").notNull().default(""),

  // Pallbearers, as one comma-separated string. Which ones were picked is kept
  // too, so reopening the record preselects them; the names are what reaches
  // document 7 and they do not change when the list does.
  bearerIds: text("bearer_ids").notNull().default(""),
  bearerNames: text("bearer_names").notNull().default(""),

  destinationCity: text("destination_city").notNull(),
  destinationProvince: text("destination_province").notNull(),
  destinationCemetery: text("destination_cemetery").notNull(),

  // Cremation, documents 8 and 9. The route is three separate municipalities
  // there — the crematorium, the stop for the funeral service, and where the
  // ashes end up — which `destination*` alone cannot express. Default to empty
  // so a record saved before these documents existed stays valid: 1-7 do not
  // use them and print nothing.
  /** Municipality of the crematorium. */
  crematoryCity: text("crematory_city").notNull().default(""),
  /** Municipality of the stop for the funeral service, on the way there. */
  funeralStopCity: text("funeral_stop_city").notNull().default(""),
  /** Municipality whose cemetery the ashes are buried in. */
  ashesCity: text("ashes_city").notNull().default(""),
  /** Who declared the wish to be cremated, e.g. "la moglie". Document 8. */
  cremationConsentRelative: text("cremation_consent_relative")
    .notNull()
    .default(""),
  burialPermitDate: text("burial_permit_date").notNull().default(""),
  /** Printed beside the deceased's name by document 9. */
  personCitizenship: text("person_citizenship").notNull().default("italiana"),

  // The mandate, document 10. Whoever confers it is neither the deceased nor
  // the client company — usually a relative, and a different one for every
  // practice, which is why they are columns here and not a table of their own.
  // All default to empty, like the cremation block above: a practice saved
  // before document 10 existed stays valid and the other nine print nothing.
  mandateFirstName: text("mandate_first_name").notNull().default(""),
  mandateLastName: text("mandate_last_name").notNull().default(""),
  mandateBirthDate: text("mandate_birth_date").notNull().default(""),
  mandateBirthCity: text("mandate_birth_city").notNull().default(""),
  mandateResidenceCity: text("mandate_residence_city").notNull().default(""),
  mandatePhone: text("mandate_phone").notNull().default(""),
  mandateTaxCode: text("mandate_tax_code").notNull().default(""),
  mandateIdType: text("mandate_id_type").notNull().default(""),
  mandateIdNumber: text("mandate_id_number").notNull().default(""),
  /** In what capacity the mandate is given, e.g. "figlio", "coniuge". */
  mandateRelationship: text("mandate_relationship").notNull().default(""),

  // The deceased as document 10 alone describes them, and which it marks
  // optional on the form itself.
  personFatherName: text("person_father_name").notNull().default(""),
  personMotherName: text("person_mother_name").notNull().default(""),
  personProfession: text("person_profession").notNull().default(""),
  /**
   * The deceased's identity document, named by document 10. The practice
   * records their tax code, not a card, so these exist only for that form. The
   * type defaults to the one it is in practice, like `person_citizenship`
   * defaults to "italiana": a practice saved before them still prints something
   * sensible, and it stays editable for a passport.
   */
  personIdType: text("person_id_type").notNull().default("Carta d'identità"),
  personIdNumber: text("person_id_number").notNull().default(""),

  /**
   * Marital status. Unlike `personSex` the empty string is a legal value: it
   * means the question was not answered, which is what every practice that does
   * not print document 10 holds. It is never printed as such — the document has
   * one tick box per option, filled in at generation time.
   */
  personMaritalStatus: text("person_marital_status", {
    enum: ["", "celibe", "coniugato", "separato", "vedovo"],
  })
    .notNull()
    .default(""),

  // The spouse, under whichever of the three branches is ticked. Married,
  // separated and widowed ask for the same details in the same positions and
  // exclude one another, so one group of columns serves all three.
  spouseName: text("spouse_name").notNull().default(""),
  spouseBirthDate: text("spouse_birth_date").notNull().default(""),
  spouseBirthCity: text("spouse_birth_city").notNull().default(""),
  spouseResidenceCity: text("spouse_residence_city").notNull().default(""),
  marriageDate: text("marriage_date").notNull().default(""),
  separationDate: text("separation_date").notNull().default(""),
  widowedSpouseDeathDate: text("widowed_spouse_death_date")
    .notNull()
    .default(""),
  widowedSpouseDeathCity: text("widowed_spouse_death_city")
    .notNull()
    .default(""),

  // The route as document 10 details it. The date, the departure time, the
  // church and the cemetery are the ones the other documents already use.
  transportDeparturePlace: text("transport_departure_place")
    .notNull()
    .default(""),
  funeralStopTime: text("funeral_stop_time").notNull().default(""),

  /** What becomes of the body. Tick boxes again, like the marital status. */
  bodyDestination: text("body_destination", {
    enum: ["", "inumata", "tumulata", "tumulataNuova", "cremata"],
  })
    .notNull()
    .default(""),
  concessionType: text("concession_type").notNull().default(""),
  concessionNumber: text("concession_number").notNull().default(""),
  /** The crematorium's furnace, when the body is cremated first. */
  crematoryAra: text("crematory_ara").notNull().default(""),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Auth = typeof auth.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Bearer = typeof bearers.$inferSelect;
export type NewBearer = typeof bearers.$inferInsert;
export type Practice = typeof practices.$inferSelect;
export type NewPractice = typeof practices.$inferInsert;
