-- A free note on each bearer, shown under the month's calendar on screen.
-- Existing bearers get an empty one.
ALTER TABLE `bearers` ADD `note` text DEFAULT '' NOT NULL;