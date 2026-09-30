-- Services done in the trial period (prova), written P, PP, PPP on the
-- calendar. Existing rows default to false: they were ordinary services.
ALTER TABLE `bearer_days` ADD `trial` integer DEFAULT false NOT NULL;