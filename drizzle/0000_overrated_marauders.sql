CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`transcript` text DEFAULT '',
	`transcriptSegments` text DEFAULT '[]',
	`summary` text DEFAULT '',
	`tasks` text DEFAULT '[]',
	`duration` text DEFAULT '0:00',
	`createdAt` text DEFAULT '',
	`relativeTime` text DEFAULT '',
	`status` text DEFAULT 'unread',
	`aiStatus` text DEFAULT 'idle',
	`transcriptProgress` integer DEFAULT 0,
	`isPinned` integer DEFAULT 0,
	`tags` text DEFAULT '[]',
	`audioPath` text
);
--> statement-breakpoint
CREATE INDEX `idx_records_isPinned` ON `records` (`isPinned`);--> statement-breakpoint
CREATE INDEX `idx_records_createdAt` ON `records` (`createdAt`);