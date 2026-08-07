CREATE TABLE `drivers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `practices` ADD `driver_id` integer REFERENCES drivers(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `driver_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner` DROP COLUMN `owner_driver_name`;