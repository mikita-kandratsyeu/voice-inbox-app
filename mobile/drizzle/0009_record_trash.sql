ALTER TABLE `records` ADD `deletedAt` text;--> statement-breakpoint
ALTER TABLE `records` ADD `purgeAt` text;--> statement-breakpoint
CREATE INDEX `idx_records_purgeAt` ON `records` (`purgeAt`);
