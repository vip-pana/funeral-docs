CREATE TABLE `owner` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`owner_first_name` text NOT NULL,
	`owner_middle_name` text DEFAULT '' NOT NULL,
	`owner_last_name` text NOT NULL,
	`owner_company_name` text NOT NULL,
	`owner_company_city` text NOT NULL,
	`owner_city` text NOT NULL,
	`owner_city_name` text NOT NULL,
	`owner_vehicle_plate` text NOT NULL,
	`owner_driver_name` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_first_name` text NOT NULL,
	`person_last_name` text NOT NULL,
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
	`destination_city` text NOT NULL,
	`destination_province` text NOT NULL,
	`destination_cemetery` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
