CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle` text NOT NULL,
	`chapter` integer NOT NULL,
	`author` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_comments_vehicle_created` ON `comments` (`vehicle`,`created_at`);--> statement-breakpoint
CREATE TABLE `models` (
	`id` text PRIMARY KEY NOT NULL,
	`vehicle` text NOT NULL,
	`name` text NOT NULL,
	`fitment` text NOT NULL,
	`source` text NOT NULL,
	`license` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_models_vehicle_created` ON `models` (`vehicle`,`created_at`);