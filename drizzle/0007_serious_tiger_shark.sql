ALTER TABLE `owner` ADD `owner_citizenship` text DEFAULT 'italiana' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `crematory_city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `funeral_stop_city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `ashes_city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `cremation_consent_relative` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `burial_permit_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` ADD `person_citizenship` text DEFAULT 'italiana' NOT NULL;