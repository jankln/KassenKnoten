CREATE TABLE `variable_booking` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`variable_cost_id` integer NOT NULL,
	`booked_on` text NOT NULL,
	`label` text,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`variable_cost_id`) REFERENCES `variable_cost`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "variable_booking_date_format" CHECK("variable_booking"."booked_on" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "variable_booking_amount_nonnegative" CHECK("variable_booking"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `variable_booking_cost_idx` ON `variable_booking` (`variable_cost_id`,`booked_on`);--> statement-breakpoint
CREATE TABLE `variable_cost` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`member_id` integer,
	`label` text NOT NULL,
	`category_id` integer,
	`mode` text DEFAULT 'plan' NOT NULL,
	`planned_cents` integer DEFAULT 0 NOT NULL,
	`split_mode` text,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "variable_cost_valid_from_format" CHECK("variable_cost"."valid_from" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "variable_cost_valid_until_range" CHECK("variable_cost"."valid_until" is null or ("variable_cost"."valid_until" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]' and "variable_cost"."valid_until" >= "variable_cost"."valid_from")),
	CONSTRAINT "variable_cost_planned_nonnegative" CHECK("variable_cost"."planned_cents" >= 0),
	CONSTRAINT "variable_cost_scope_shape" CHECK(("variable_cost"."scope" = 'private' and "variable_cost"."member_id" is not null and "variable_cost"."split_mode" is null)
          or ("variable_cost"."scope" = 'shared' and "variable_cost"."member_id" is null and "variable_cost"."split_mode" is not null))
);
--> statement-breakpoint
CREATE INDEX `variable_cost_scope_idx` ON `variable_cost` (`scope`,`active`);--> statement-breakpoint
CREATE INDEX `variable_cost_member_idx` ON `variable_cost` (`member_id`);--> statement-breakpoint
CREATE INDEX `variable_cost_validity_idx` ON `variable_cost` (`valid_from`,`valid_until`);--> statement-breakpoint
CREATE TABLE `variable_cost_share` (
	`variable_cost_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`share_bp` integer NOT NULL,
	PRIMARY KEY(`variable_cost_id`, `member_id`),
	FOREIGN KEY (`variable_cost_id`) REFERENCES `variable_cost`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "variable_cost_share_range" CHECK("variable_cost_share"."share_bp" between 0 and 10000)
);
