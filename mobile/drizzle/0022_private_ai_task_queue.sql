CREATE TABLE IF NOT EXISTS `private_ai_task_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`recordId` text NOT NULL,
	`taskType` text NOT NULL,
	`source` text NOT NULL,
	`attemptCount` integer DEFAULT 0 NOT NULL,
	`lastError` text,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_private_ai_task_queue_recordId` ON `private_ai_task_queue` (`recordId`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_private_ai_task_queue_record_task` ON `private_ai_task_queue` (`recordId`,`taskType`);
