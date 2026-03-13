ALTER TABLE `records` ADD `classification` text;--> statement-breakpoint
ALTER TABLE `records` ADD `keyPhrases` text DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `records` ADD `nextSteps` text DEFAULT '[]';
