CREATE TABLE `movies` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`original_title` text,
	`year` integer,
	`duration` integer,
	`poster_path` text,
	`genres` text,
	`directors` text,
	`main_cast` text,
	`raw` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`movie_id` integer PRIMARY KEY NOT NULL,
	`rate` integer NOT NULL,
	`view_date` integer,
	`vote_timestamp` integer,
	`comments_count` integer,
	`likes_count` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`movie_id`) REFERENCES `movies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scrape_queue` (
	`movie_id` integer PRIMARY KEY NOT NULL,
	`voted_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`updated_at` integer NOT NULL
);
