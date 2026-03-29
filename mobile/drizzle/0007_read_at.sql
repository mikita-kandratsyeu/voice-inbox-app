ALTER TABLE `records` ADD `readAt` text;--> statement-breakpoint
UPDATE `records` SET `readAt` = `createdAt` WHERE `status` = 'read' AND (`readAt` IS NULL OR `readAt` = '');
