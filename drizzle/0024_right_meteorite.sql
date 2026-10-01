-- Half a day of travel, morning or afternoon, beside the rest of the day: a
-- whole day of travel is code "V". Existing rows keep NULL: no travel.
ALTER TABLE `bearer_days` ADD `travel_half` text;
