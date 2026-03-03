-- Add description fields to tasks
ALTER TABLE `tasks` ADD COLUMN `description` text;
--> statement-breakpoint
ALTER TABLE `tasks` ADD COLUMN `canvas_description` text;
