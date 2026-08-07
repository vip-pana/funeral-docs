CREATE TABLE `bearers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `owner` ADD `owner_birth_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner` ADD `owner_birth_city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner` ADD `owner_address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner` ADD `owner_postal_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner` ADD `owner_id_type` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner` ADD `owner_id_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner` ADD `owner_id_issuer` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner` ADD `owner_id_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `bearer_ids` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `bearer_names` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `applicant_role` text DEFAULT '' NOT NULL;