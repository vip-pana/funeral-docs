ALTER TABLE `clients` ADD `company_vat_number` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `company_tax_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `company_address_city` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `company_address` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `company_postal_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `company_sdi_code` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `company_pec` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `company_email` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `practices` DROP COLUMN `applicant_role`;