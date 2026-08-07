-- The `drivers` table disappears: anyone in `bearers` can drive, so a boolean
-- there says who does, and `practices.driver_id` now points at `bearers`.
--
-- Order matters, and the generated version had it wrong: it dropped `drivers`
-- first, which nulls every `practices.driver_id` on the way out (see below), so
-- the links were gone before there was anywhere to move them to. Here the links
-- are snapshotted into `__old_drv` BEFORE anything is dropped, each driver is
-- merged into `bearers` through `__drv_map`, and the links are restored last.
--
-- The snapshot is required, not belt-and-braces. `PRAGMA foreign_keys=OFF` is a
-- no-op inside a transaction and drizzle wraps the migration in one, so
-- enforcement stays on: `DROP TABLE drivers` fires `ON DELETE SET NULL` and
-- wipes every `practices.driver_id`. `PRAGMA foreign_key_check` still reports
-- nothing afterwards, because NULL is a legal foreign key — the failure is
-- invisible except as a driver that has vanished from a record. Migration 0004
-- documents the same trap.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
ALTER TABLE `bearers` ADD `is_driver` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE `__old_drv` (`practice` text NOT NULL, `driver` text NOT NULL);--> statement-breakpoint
INSERT INTO `__old_drv`("practice", "driver") SELECT `id`, `driver_id` FROM `practices` WHERE `driver_id` IS NOT NULL;--> statement-breakpoint
-- Where each driver ends up in `bearers`. Matched by name, the only key the two
-- tables share; neither has a unique constraint on it, so the oldest row wins
-- for a duplicate name. Both lists are small enough for that to be safe.
CREATE TABLE `__drv_map` (`old` text NOT NULL, `new` text NOT NULL);--> statement-breakpoint
INSERT INTO `__drv_map`("old", "new") SELECT d.`id`, (SELECT b.`id` FROM `bearers` b WHERE b.`name` = d.`name` ORDER BY b.`created_at`, b.`id` LIMIT 1) FROM `drivers` d WHERE EXISTS (SELECT 1 FROM `bearers` b WHERE b.`name` = d.`name`);--> statement-breakpoint
UPDATE `bearers` SET `is_driver` = 1 WHERE `id` IN (SELECT `new` FROM `__drv_map`);--> statement-breakpoint
-- The rest become new bearers. Canonical v4 UUIDs in pure SQL: SQLite has no
-- uuid() function, and the schema's `$defaultFn` runs in JavaScript, not here.
INSERT INTO `__drv_map`("old", "new") SELECT d.`id`, lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `drivers` d WHERE d.`id` NOT IN (SELECT `old` FROM `__drv_map`);--> statement-breakpoint
INSERT INTO `bearers`("id", "name", "is_driver", "created_at") SELECT m.`new`, d.`name`, 1, d.`created_at` FROM `drivers` d JOIN `__drv_map` m ON m.`old` = d.`id` WHERE m.`new` NOT IN (SELECT `id` FROM `bearers`);--> statement-breakpoint
DROP TABLE `drivers`;--> statement-breakpoint
-- SQLite cannot repoint a foreign key with ALTER, so `practices` is recreated.
CREATE TABLE `__new_practices` (
	`id` text PRIMARY KEY NOT NULL,
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
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`driver_id`) REFERENCES `bearers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_practices`("id", "person_first_name", "person_last_name", "person_sex", "person_tax_code", "person_birth_date", "person_birth_city", "person_residence_city", "person_residence_address", "person_death_date", "person_death_time", "person_death_city", "person_death_place", "transport_date", "transport_time", "transport_permit_date", "funeral_church", "vehicle_id", "vehicle_plate", "driver_id", "driver_name", "bearer_ids", "bearer_names", "applicant_role", "destination_city", "destination_province", "destination_cemetery", "created_at", "updated_at") SELECT "id", "person_first_name", "person_last_name", "person_sex", "person_tax_code", "person_birth_date", "person_birth_city", "person_residence_city", "person_residence_address", "person_death_date", "person_death_time", "person_death_city", "person_death_place", "transport_date", "transport_time", "transport_permit_date", "funeral_church", "vehicle_id", "vehicle_plate", "driver_id", "driver_name", "bearer_ids", "bearer_names", "applicant_role", "destination_city", "destination_province", "destination_cemetery", "created_at", "updated_at" FROM `practices`;--> statement-breakpoint
DROP TABLE `practices`;--> statement-breakpoint
ALTER TABLE `__new_practices` RENAME TO `practices`;--> statement-breakpoint
-- Restore the links, translating each old driver id to the bearer it became.
-- Whatever `driver_id` holds now is worthless: the DROP above nulled it.
UPDATE `practices` SET `driver_id` = (SELECT m.`new` FROM `__old_drv` l JOIN `__drv_map` m ON m.`old` = l.`driver` WHERE l.`practice` = `practices`.`id`) WHERE `id` IN (SELECT `practice` FROM `__old_drv`);--> statement-breakpoint
DROP TABLE `__old_drv`;--> statement-breakpoint
DROP TABLE `__drv_map`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
