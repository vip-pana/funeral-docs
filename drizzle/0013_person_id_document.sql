-- The deceased's identity document (type and number), and the invoice block out.
--
-- Document 10 names an identity document for the deceased. The practice records
-- their tax code, not a card, so the line had stayed literal; these two columns
-- fill it. The type defaults to the one it is in practice, so records saved
-- before today print something sensible without being reopened.
--
-- The seven `billing_*` columns go. The form asked who to make the invoice out
-- to, but in practice nobody ever filled it in, and those two lines of the
-- document go back to being completed by hand. The data in them is lost: that
-- is the point, and it was confirmed before writing this.
--
-- Hand-written, like 0008 and for the same reason: drizzle-kit sees seven
-- columns dropped and two added, cannot tell a removal from a rename, and stops
-- to ask. Answering wrong would carry `billing_name` into `person_id_type` —
-- values surviving into the wrong field, which is worse than losing them.
--
-- The two new columns are added first, so existing rows take the DEFAULT rather
-- than the empty string the rebuild would give them. `practices` is then
-- recreated because SQLite cannot drop a column that a table-level constraint
-- mentions, and because ALTER TABLE ... DROP COLUMN would leave the three
-- foreign keys to rebuild anyway.
ALTER TABLE `practices` ADD `person_id_type` text DEFAULT 'Carta d''identità' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `person_id_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
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
	`vehicle_name` text DEFAULT '' NOT NULL,
	`driver_id` text,
	`driver_name` text DEFAULT '' NOT NULL,
	`bearer_ids` text DEFAULT '' NOT NULL,
	`bearer_names` text DEFAULT '' NOT NULL,
	`destination_city` text NOT NULL,
	`destination_province` text NOT NULL,
	`destination_cemetery` text NOT NULL,
	`crematory_city` text DEFAULT '' NOT NULL,
	`funeral_stop_city` text DEFAULT '' NOT NULL,
	`ashes_city` text DEFAULT '' NOT NULL,
	`cremation_consent_relative` text DEFAULT '' NOT NULL,
	`burial_permit_date` text DEFAULT '' NOT NULL,
	`person_citizenship` text DEFAULT 'italiana' NOT NULL,
	`mandate_first_name` text DEFAULT '' NOT NULL,
	`mandate_last_name` text DEFAULT '' NOT NULL,
	`mandate_birth_date` text DEFAULT '' NOT NULL,
	`mandate_birth_city` text DEFAULT '' NOT NULL,
	`mandate_residence_city` text DEFAULT '' NOT NULL,
	`mandate_phone` text DEFAULT '' NOT NULL,
	`mandate_tax_code` text DEFAULT '' NOT NULL,
	`mandate_id_type` text DEFAULT '' NOT NULL,
	`mandate_id_number` text DEFAULT '' NOT NULL,
	`mandate_relationship` text DEFAULT '' NOT NULL,
	`person_father_name` text DEFAULT '' NOT NULL,
	`person_mother_name` text DEFAULT '' NOT NULL,
	`person_profession` text DEFAULT '' NOT NULL,
	`person_id_type` text DEFAULT 'Carta d''identità' NOT NULL,
	`person_id_number` text DEFAULT '' NOT NULL,
	`person_marital_status` text DEFAULT '' NOT NULL,
	`spouse_name` text DEFAULT '' NOT NULL,
	`spouse_birth_date` text DEFAULT '' NOT NULL,
	`spouse_birth_city` text DEFAULT '' NOT NULL,
	`spouse_residence_city` text DEFAULT '' NOT NULL,
	`marriage_date` text DEFAULT '' NOT NULL,
	`separation_date` text DEFAULT '' NOT NULL,
	`widowed_spouse_death_date` text DEFAULT '' NOT NULL,
	`widowed_spouse_death_city` text DEFAULT '' NOT NULL,
	`transport_departure_place` text DEFAULT '' NOT NULL,
	`funeral_stop_time` text DEFAULT '' NOT NULL,
	`body_destination` text DEFAULT '' NOT NULL,
	`concession_type` text DEFAULT '' NOT NULL,
	`concession_number` text DEFAULT '' NOT NULL,
	`crematory_ara` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT [object Object] NOT NULL,
	`updated_at` text DEFAULT [object Object] NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`driver_id`) REFERENCES `bearers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_practices`("id", "client_id", "client_name", "person_first_name", "person_last_name", "person_sex", "person_tax_code", "person_birth_date", "person_birth_city", "person_residence_city", "person_residence_address", "person_death_date", "person_death_time", "person_death_city", "person_death_place", "transport_date", "transport_time", "transport_permit_date", "funeral_church", "vehicle_id", "vehicle_plate", "vehicle_name", "driver_id", "driver_name", "bearer_ids", "bearer_names", "destination_city", "destination_province", "destination_cemetery", "crematory_city", "funeral_stop_city", "ashes_city", "cremation_consent_relative", "burial_permit_date", "person_citizenship", "mandate_first_name", "mandate_last_name", "mandate_birth_date", "mandate_birth_city", "mandate_residence_city", "mandate_phone", "mandate_tax_code", "mandate_id_type", "mandate_id_number", "mandate_relationship", "person_father_name", "person_mother_name", "person_profession", "person_id_type", "person_id_number", "person_marital_status", "spouse_name", "spouse_birth_date", "spouse_birth_city", "spouse_residence_city", "marriage_date", "separation_date", "widowed_spouse_death_date", "widowed_spouse_death_city", "transport_departure_place", "funeral_stop_time", "body_destination", "concession_type", "concession_number", "crematory_ara", "created_at", "updated_at") SELECT "id", "client_id", "client_name", "person_first_name", "person_last_name", "person_sex", "person_tax_code", "person_birth_date", "person_birth_city", "person_residence_city", "person_residence_address", "person_death_date", "person_death_time", "person_death_city", "person_death_place", "transport_date", "transport_time", "transport_permit_date", "funeral_church", "vehicle_id", "vehicle_plate", "vehicle_name", "driver_id", "driver_name", "bearer_ids", "bearer_names", "destination_city", "destination_province", "destination_cemetery", "crematory_city", "funeral_stop_city", "ashes_city", "cremation_consent_relative", "burial_permit_date", "person_citizenship", "mandate_first_name", "mandate_last_name", "mandate_birth_date", "mandate_birth_city", "mandate_residence_city", "mandate_phone", "mandate_tax_code", "mandate_id_type", "mandate_id_number", "mandate_relationship", "person_father_name", "person_mother_name", "person_profession", "person_id_type", "person_id_number", "person_marital_status", "spouse_name", "spouse_birth_date", "spouse_birth_city", "spouse_residence_city", "marriage_date", "separation_date", "widowed_spouse_death_date", "widowed_spouse_death_city", "transport_departure_place", "funeral_stop_time", "body_destination", "concession_type", "concession_number", "crematory_ara", "created_at", "updated_at" FROM `practices`;--> statement-breakpoint
DROP TABLE `practices`;--> statement-breakpoint
ALTER TABLE `__new_practices` RENAME TO `practices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
