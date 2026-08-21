CREATE TABLE `app_setting` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT 'circle' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_name_unique` ON `category` (`name`);--> statement-breakpoint
CREATE TABLE `default_share` (
	`member_id` integer PRIMARY KEY NOT NULL,
	`share_bp` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "default_share_range" CHECK("default_share"."share_bp" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE `expense` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`member_id` integer,
	`label` text NOT NULL,
	`category_id` integer,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`interval_months` integer DEFAULT 1 NOT NULL,
	`due_month` integer,
	`split_mode` text,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "expense_amount_nonnegative" CHECK("expense"."amount_cents" >= 0),
	CONSTRAINT "expense_interval_positive" CHECK("expense"."interval_months" > 0),
	CONSTRAINT "expense_due_month_range" CHECK("expense"."due_month" is null or "expense"."due_month" between 1 and 12),
	CONSTRAINT "expense_scope_shape" CHECK(("expense"."scope" = 'private' and "expense"."member_id" is not null and "expense"."split_mode" is null)
          or ("expense"."scope" = 'shared' and "expense"."member_id" is null and "expense"."split_mode" is not null))
);
--> statement-breakpoint
CREATE INDEX `expense_scope_idx` ON `expense` (`scope`,`active`);--> statement-breakpoint
CREATE INDEX `expense_member_idx` ON `expense` (`member_id`);--> statement-breakpoint
CREATE TABLE `expense_share` (
	`expense_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`share_bp` integer NOT NULL,
	PRIMARY KEY(`expense_id`, `member_id`),
	FOREIGN KEY (`expense_id`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "expense_share_range" CHECK("expense_share"."share_bp" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE `household` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`default_split_mode` text DEFAULT 'fixed_quota' NOT NULL,
	`onboarding_done` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "household_singleton" CHECK("household"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `income` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`label` text NOT NULL,
	`kind` text DEFAULT 'salary' NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`interval_months` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "income_amount_nonnegative" CHECK("income"."amount_cents" >= 0),
	CONSTRAINT "income_interval_positive" CHECK("income"."interval_months" > 0)
);
--> statement-breakpoint
CREATE INDEX `income_member_idx` ON `income` (`member_id`);--> statement-breakpoint
CREATE TABLE `member` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color_index` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `savings_pot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`owner_member_id` integer,
	`monthly_rate_cents` integer DEFAULT 0 NOT NULL,
	`balance_cents` integer DEFAULT 0 NOT NULL,
	`target_cents` integer,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`owner_member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "savings_rate_nonnegative" CHECK("savings_pot"."monthly_rate_cents" >= 0),
	CONSTRAINT "savings_target_positive" CHECK("savings_pot"."target_cents" is null or "savings_pot"."target_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE `snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period` text NOT NULL,
	`taken_at` integer DEFAULT (unixepoch()) NOT NULL,
	`income_cents` integer NOT NULL,
	`fixed_private_cents` integer NOT NULL,
	`fixed_shared_cents` integer NOT NULL,
	`savings_rate_cents` integer NOT NULL,
	`savings_balance_cents` integer NOT NULL,
	`free_cash_cents` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshot_period_unique` ON `snapshot` (`period`);--> statement-breakpoint
CREATE TABLE `snapshot_member` (
	`snapshot_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`member_name` text NOT NULL,
	`income_cents` integer NOT NULL,
	`own_fixed_cents` integer NOT NULL,
	`shared_share_cents` integer NOT NULL,
	`remainder_cents` integer NOT NULL,
	PRIMARY KEY(`snapshot_id`, `member_id`),
	FOREIGN KEY (`snapshot_id`) REFERENCES `snapshot`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade
);
