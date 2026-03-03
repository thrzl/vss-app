-- Canvas integration table (stores per-user Canvas API credentials)
CREATE TABLE `canvas_integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`canvas_url` text NOT NULL,
	`api_token` text NOT NULL,
	`last_sync_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `canvas_integrations_user_id_unique` ON `canvas_integrations` (`user_id`);
--> statement-breakpoint
-- Canvas sync log table (tracks each sync operation for debugging)
CREATE TABLE `canvas_sync_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`tasks_created` integer DEFAULT 0 NOT NULL,
	`tasks_updated` integer DEFAULT 0 NOT NULL,
	`tasks_completed` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`synced_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
-- Extend tasks table with Canvas sync columns
ALTER TABLE `tasks` ADD COLUMN `canvas_id` text;
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `canvas_course_id` text;
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `source` text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `synced_at` text;
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `last_local_edit` text;
