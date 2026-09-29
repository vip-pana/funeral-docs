CREATE TABLE `bearer_days` (
	`id` text PRIMARY KEY NOT NULL,
	`bearer_id` text NOT NULL,
	`date` text NOT NULL,
	`code` text DEFAULT 'F' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`bearer_id`) REFERENCES `bearers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bearer_days_bearer_date` ON `bearer_days` (`bearer_id`,`date`);