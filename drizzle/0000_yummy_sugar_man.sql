CREATE TABLE `records` (
	`entity` text NOT NULL,
	`id` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`entity`, `id`)
);
--> statement-breakpoint
CREATE TABLE `site_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
