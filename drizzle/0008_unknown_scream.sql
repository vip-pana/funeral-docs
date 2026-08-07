-- The single-row `owner` table becomes `clients`, a list: one declarant and one
-- company per row, and each record picks which one the documents are issued
-- for. `practices` gains the reference plus a copy of the name, the same split
-- already used for the hearse and the driver.
--
-- Hand-written. drizzle-kit read the change as a rename and matched the columns
-- by position, producing `owner_middle_name` -> `first_name` and
-- `owner_company_name` -> `last_name`: the values would have survived into the
-- wrong fields, which is worse than losing them. Nothing is carried over here
-- on purpose — the one existing configuration is re-entered as the first
-- client.
--
-- `practices` is recreated rather than extended with ADD COLUMN. That would
-- work, and SQLite even accepts a REFERENCES clause there, but it silently
-- drops the ON DELETE: the column comes out NO ACTION, and deleting a client
-- then fails on every record that used it. The whole point of copying the name
-- is that deleting one must not lock those records.
--
-- Nothing is snapshotted before the DROP, unlike migrations 0004 and 0006: the
-- table being dropped here, `owner`, is referenced by nothing, so no
-- ON DELETE SET NULL fires on the way out and no link is lost. The existing
-- `vehicle_id` and `driver_id` survive because the INSERT below copies them
-- before `practices` is dropped.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
DROP TABLE `owner`;--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`middle_name` text DEFAULT '' NOT NULL,
	`last_name` text NOT NULL,
	`company_name` text NOT NULL,
	`company_city` text NOT NULL,
	`city` text NOT NULL,
	`city_name` text NOT NULL,
	`birth_date` text DEFAULT '' NOT NULL,
	`birth_city` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`postal_code` text DEFAULT '' NOT NULL,
	`id_type` text DEFAULT '' NOT NULL,
	`id_number` text DEFAULT '' NOT NULL,
	`id_issuer` text DEFAULT '' NOT NULL,
	`id_date` text DEFAULT '' NOT NULL,
	`citizenship` text DEFAULT 'italiana' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `__new_practices` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text,
	`client_name` text DEFAULT '' NOT NULL,
	`person_first_name` text NOT NULL,
	`person_last_name` text NOT NULL,
	`person_sex` text DEFAULT 'M' NOT NULL,
	`person_tax_code` text NOT NULL,
	`person_birth_date` text NOT NULL,
	`person_birth_city` text NOT NULL,
	`person_residence_city` text NOT NULL,
	`person_residence_address` text NOT NULL,
	`person_death_date` text NOT NULL,
	`person_death_time` text NOT NULL,
	`person_death_city` text NOT NULL,
	`person_death_place` text NOT NULL,
	`transport_date` text NOT NULL,
	`transport_time` text NOT NULL,
	`transport_permit_date` text NOT NULL,
	`funeral_church` text DEFAULT '' NOT NULL,
	`vehicle_id` text,
	`vehicle_plate` text DEFAULT '' NOT NULL,
	`driver_id` text,
	`driver_name` text DEFAULT '' NOT NULL,
	`bearer_ids` text DEFAULT '' NOT NULL,
	`bearer_names` text DEFAULT '' NOT NULL,
	`applicant_role` text DEFAULT '' NOT NULL,
	`destination_city` text NOT NULL,
	`destination_province` text NOT NULL,
	`destination_cemetery` text NOT NULL,
	`crematory_city` text DEFAULT '' NOT NULL,
	`funeral_stop_city` text DEFAULT '' NOT NULL,
	`ashes_city` text DEFAULT '' NOT NULL,
	`cremation_consent_relative` text DEFAULT '' NOT NULL,
	`burial_permit_date` text DEFAULT '' NOT NULL,
	`person_citizenship` text DEFAULT 'italiana' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`driver_id`) REFERENCES `bearers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
-- `client_id` and `client_name` are left at their defaults: existing records
-- have no client, and one has to be picked by hand when they are next saved.
INSERT INTO `__new_practices`("id", "person_first_name", "person_last_name", "person_sex", "person_tax_code", "person_birth_date", "person_birth_city", "person_residence_city", "person_residence_address", "person_death_date", "person_death_time", "person_death_city", "person_death_place", "transport_date", "transport_time", "transport_permit_date", "funeral_church", "vehicle_id", "vehicle_plate", "driver_id", "driver_name", "bearer_ids", "bearer_names", "applicant_role", "destination_city", "destination_province", "destination_cemetery", "crematory_city", "funeral_stop_city", "ashes_city", "cremation_consent_relative", "burial_permit_date", "person_citizenship", "created_at", "updated_at") SELECT "id", "person_first_name", "person_last_name", "person_sex", "person_tax_code", "person_birth_date", "person_birth_city", "person_residence_city", "person_residence_address", "person_death_date", "person_death_time", "person_death_city", "person_death_place", "transport_date", "transport_time", "transport_permit_date", "funeral_church", "vehicle_id", "vehicle_plate", "driver_id", "driver_name", "bearer_ids", "bearer_names", "applicant_role", "destination_city", "destination_province", "destination_cemetery", "crematory_city", "funeral_stop_city", "ashes_city", "cremation_consent_relative", "burial_permit_date", "person_citizenship", "created_at", "updated_at" FROM `practices`;--> statement-breakpoint
DROP TABLE `practices`;--> statement-breakpoint
ALTER TABLE `__new_practices` RENAME TO `practices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
