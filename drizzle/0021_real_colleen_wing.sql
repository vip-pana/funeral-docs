-- Half a day off, morning or afternoon, beside the services done in the other
-- half: code "H" for ferie, "R" for rest. Existing rows keep NULL: they are
-- not half days, and a rest with no half is the whole day.
ALTER TABLE `bearer_days` ADD `half_day` text;
