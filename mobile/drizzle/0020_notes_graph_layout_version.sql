CREATE TABLE `notes_graph_layout_version` (
	`id` text PRIMARY KEY NOT NULL,
	`layoutKey` text NOT NULL,
	`versionNumber` integer NOT NULL,
	`payload` text NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_notes_graph_layout_key` ON `notes_graph_layout_version` (`layoutKey`);
--> statement-breakpoint
CREATE INDEX `idx_notes_graph_layout_created` ON `notes_graph_layout_version` (`createdAt`);
