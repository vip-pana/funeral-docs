-- Integer autoincrement primary keys become UUIDs.
--
-- SQLite cannot change the type of a primary key, so each table is recreated
-- and the rows copied across. drizzle-kit generates that part; the UUID backfill
-- below is hand-written, because the generated `INSERT … SELECT` copies the old
-- integer ids verbatim into the new text column without converting anything.
--
-- The links between practices and their hearse/driver are snapshotted into
-- `__old_links` BEFORE anything is dropped, and restored at the end.
--
-- That is not belt-and-braces, it is required. `PRAGMA foreign_keys=OFF` is a
-- no-op inside a transaction and drizzle wraps the migration in one, so
-- enforcement stays on: `DROP TABLE vehicles` fires `ON DELETE SET NULL` and
-- wipes every `practices.vehicle_id` before the backfill can even read it.
-- Verified — without the snapshot the four linked rows come out NULL, and
-- `PRAGMA foreign_key_check` still reports no violations, because NULL is a
-- legal foreign key. The failure is invisible except as a hearse that has
-- disappeared from a record.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
-- Old integer ids, cast to text: copying an integer into a TEXT column converts
-- it, and SQLite says 20 = '20' is false, so the later joins need both sides
-- to be text already.
CREATE TABLE `__old_links` (`practice` text NOT NULL, `vehicle` text, `driver` text);--> statement-breakpoint
INSERT INTO `__old_links`("practice", "vehicle", "driver") SELECT CAST(`id` AS text), CAST(`vehicle_id` AS text), CAST(`driver_id` AS text) FROM `practices`;--> statement-breakpoint
CREATE TABLE `__new_drivers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_drivers`("id", "name", "created_at") SELECT "id", "name", "created_at" FROM `drivers`;--> statement-breakpoint
DROP TABLE `drivers`;--> statement-breakpoint
ALTER TABLE `__new_drivers` RENAME TO `drivers`;--> statement-breakpoint
CREATE TABLE `__new_vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`plate` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_vehicles`("id", "name", "plate", "created_at") SELECT "id", "name", "plate", "created_at" FROM `vehicles`;--> statement-breakpoint
DROP TABLE `vehicles`;--> statement-breakpoint
ALTER TABLE `__new_vehicles` RENAME TO `vehicles`;--> statement-breakpoint
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
	`destination_city` text NOT NULL,
	`destination_province` text NOT NULL,
	`destination_cemetery` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_practices`("id", "person_first_name", "person_last_name", "person_sex", "person_tax_code", "person_birth_date", "person_birth_city", "person_residence_city", "person_residence_address", "person_death_date", "person_death_time", "person_death_city", "person_death_place", "transport_date", "transport_time", "transport_permit_date", "funeral_church", "vehicle_id", "vehicle_plate", "driver_id", "driver_name", "destination_city", "destination_province", "destination_cemetery", "created_at", "updated_at") SELECT "id", "person_first_name", "person_last_name", "person_sex", "person_tax_code", "person_birth_date", "person_birth_city", "person_residence_city", "person_residence_address", "person_death_date", "person_death_time", "person_death_city", "person_death_place", "transport_date", "transport_time", "transport_permit_date", "funeral_church", "vehicle_id", "vehicle_plate", "driver_id", "driver_name", "destination_city", "destination_province", "destination_cemetery", "created_at", "updated_at" FROM `practices`;--> statement-breakpoint
DROP TABLE `practices`;--> statement-breakpoint
ALTER TABLE `__new_practices` RENAME TO `practices`;--> statement-breakpoint
-- Canonical v4 UUIDs in pure SQL: SQLite has no uuid() function, and the
-- application-side `$defaultFn` does not apply to these UPDATE statements.
--
-- Parents first, then the links restored from `__old_links`: at this point
-- `practices.vehicle_id`/`driver_id` have already been nulled by the cascade on
-- DROP (see the header), so the old value can only come from the snapshot.
CREATE TABLE `__uuid_vehicles` (`old` text NOT NULL, `new` text NOT NULL);--> statement-breakpoint
INSERT INTO `__uuid_vehicles`("old", "new") SELECT CAST(`id` AS text), lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `vehicles`;--> statement-breakpoint
UPDATE `vehicles` SET `id` = (SELECT `new` FROM `__uuid_vehicles` WHERE `old` = CAST(`vehicles`.`id` AS text));--> statement-breakpoint
CREATE TABLE `__uuid_drivers` (`old` text NOT NULL, `new` text NOT NULL);--> statement-breakpoint
INSERT INTO `__uuid_drivers`("old", "new") SELECT CAST(`id` AS text), lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))) FROM `drivers`;--> statement-breakpoint
UPDATE `drivers` SET `id` = (SELECT `new` FROM `__uuid_drivers` WHERE `old` = CAST(`drivers`.`id` AS text));--> statement-breakpoint
-- Restore the links, translating each old integer id through its mapping.
UPDATE `practices` SET `vehicle_id` = (SELECT u.`new` FROM `__old_links` l JOIN `__uuid_vehicles` u ON u.`old` = l.`vehicle` WHERE l.`practice` = `practices`.`id`) WHERE `id` IN (SELECT l.`practice` FROM `__old_links` l WHERE l.`vehicle` IS NOT NULL);--> statement-breakpoint
UPDATE `practices` SET `driver_id` = (SELECT u.`new` FROM `__old_links` l JOIN `__uuid_drivers` u ON u.`old` = l.`driver` WHERE l.`practice` = `practices`.`id`) WHERE `id` IN (SELECT l.`practice` FROM `__old_links` l WHERE l.`driver` IS NOT NULL);--> statement-breakpoint
DROP TABLE `__uuid_vehicles`;--> statement-breakpoint
DROP TABLE `__uuid_drivers`;--> statement-breakpoint
-- Nothing references practices, so its own ids need no mapping table. Done last:
-- __old_links keys on the old practice id.
UPDATE `practices` SET `id` = lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6)));--> statement-breakpoint
DROP TABLE `__old_links`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
