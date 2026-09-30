-- The driver can now be a client's declarant as well as a bearer.
--
-- drizzle-kit generated the ADD COLUMN without its ON DELETE, which would make
-- the column NO ACTION and stop a client from being deleted while any record
-- names them as driver. SQLite keeps the clause when it is written out, so it
-- is added here by hand rather than rebuilding the table.
ALTER TABLE `practices` ADD `driver_client_id` text REFERENCES clients(id) ON DELETE SET NULL;
