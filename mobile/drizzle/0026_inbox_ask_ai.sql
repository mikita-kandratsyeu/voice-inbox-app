CREATE TABLE IF NOT EXISTS `inbox_ask_ai` (
	`sessionKey` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updatedAt` text NOT NULL
);
