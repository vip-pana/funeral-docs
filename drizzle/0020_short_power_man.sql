-- The calendar rows get an order set by hand. It starts from the one they had,
-- tallest first and then by name, so nothing moves until someone drags a row.
ALTER TABLE `bearers` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `bearers` SET `position` = (
	SELECT `n` FROM (
		SELECT `id`, ROW_NUMBER() OVER (
			ORDER BY `shoulder_height` IS NULL, `shoulder_height` DESC, `name` COLLATE NOCASE
		) - 1 AS `n`
		FROM `bearers`
	) AS `r`
	WHERE `r`.`id` = `bearers`.`id`
);
