CREATE TABLE `vehicles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`plate` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `practices` ADD `vehicle_id` integer REFERENCES vehicles(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `vehicle_plate` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `owner` DROP COLUMN `owner_vehicle_plate`;