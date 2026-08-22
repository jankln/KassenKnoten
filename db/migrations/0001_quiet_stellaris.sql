-- Effective-dated incomes and fixed costs (F19).
--
-- The generated statement selected "valid_from" out of the old table, where the column
-- does not exist yet; on any database with rows in it that fails outright. Existing
-- entries are instead backfilled to the earliest month this household has evidence of —
-- its own creation month, or an older snapshot period — so nothing disappears from a
-- month it was already showing up in, and no placeholder date ends up in front of the
-- user. "valid_until" stays NULL: everything that exists today is still valid today.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_expense` (
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
	`valid_from` text NOT NULL,
	`valid_until` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "expense_valid_from_format" CHECK("__new_expense"."valid_from" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "expense_valid_until_range" CHECK("__new_expense"."valid_until" is null or ("__new_expense"."valid_until" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]' and "__new_expense"."valid_until" >= "__new_expense"."valid_from")),
	CONSTRAINT "expense_amount_nonnegative" CHECK("__new_expense"."amount_cents" >= 0),
	CONSTRAINT "expense_interval_positive" CHECK("__new_expense"."interval_months" > 0),
	CONSTRAINT "expense_due_month_range" CHECK("__new_expense"."due_month" is null or "__new_expense"."due_month" between 1 and 12),
	CONSTRAINT "expense_scope_shape" CHECK(("__new_expense"."scope" = 'private' and "__new_expense"."member_id" is not null and "__new_expense"."split_mode" is null)
          or ("__new_expense"."scope" = 'shared' and "__new_expense"."member_id" is null and "__new_expense"."split_mode" is not null))
);
--> statement-breakpoint
INSERT INTO `__new_expense`("id", "scope", "member_id", "label", "category_id", "amount_cents", "interval_months", "due_month", "split_mode", "note", "sort_order", "active", "valid_from", "valid_until", "created_at", "updated_at")
SELECT "id", "scope", "member_id", "label", "category_id", "amount_cents", "interval_months", "due_month", "split_mode", "note", "sort_order", "active",
  (SELECT COALESCE(MIN(p), strftime('%Y-%m', 'now', 'localtime')) FROM (
    SELECT strftime('%Y-%m', "created_at", 'unixepoch', 'localtime') AS p FROM `household`
    UNION ALL
    SELECT MIN("period") AS p FROM `snapshot`
  ) WHERE p IS NOT NULL),
  NULL,
  "created_at", "updated_at"
FROM `expense`;--> statement-breakpoint
DROP TABLE `expense`;--> statement-breakpoint
ALTER TABLE `__new_expense` RENAME TO `expense`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `expense_scope_idx` ON `expense` (`scope`,`active`);--> statement-breakpoint
CREATE INDEX `expense_member_idx` ON `expense` (`member_id`);--> statement-breakpoint
CREATE INDEX `expense_validity_idx` ON `expense` (`valid_from`,`valid_until`);--> statement-breakpoint
CREATE TABLE `__new_income` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`member_id` integer NOT NULL,
	`label` text NOT NULL,
	`kind` text DEFAULT 'salary' NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`interval_months` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `member`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "income_amount_nonnegative" CHECK("__new_income"."amount_cents" >= 0),
	CONSTRAINT "income_interval_positive" CHECK("__new_income"."interval_months" > 0),
	CONSTRAINT "income_valid_from_format" CHECK("__new_income"."valid_from" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
	CONSTRAINT "income_valid_until_range" CHECK("__new_income"."valid_until" is null or ("__new_income"."valid_until" glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]' and "__new_income"."valid_until" >= "__new_income"."valid_from"))
);
--> statement-breakpoint
INSERT INTO `__new_income`("id", "member_id", "label", "kind", "amount_cents", "interval_months", "active", "valid_from", "valid_until", "created_at", "updated_at")
SELECT "id", "member_id", "label", "kind", "amount_cents", "interval_months", "active",
  (SELECT COALESCE(MIN(p), strftime('%Y-%m', 'now', 'localtime')) FROM (
    SELECT strftime('%Y-%m', "created_at", 'unixepoch', 'localtime') AS p FROM `household`
    UNION ALL
    SELECT MIN("period") AS p FROM `snapshot`
  ) WHERE p IS NOT NULL),
  NULL,
  "created_at", "updated_at"
FROM `income`;--> statement-breakpoint
DROP TABLE `income`;--> statement-breakpoint
ALTER TABLE `__new_income` RENAME TO `income`;--> statement-breakpoint
CREATE INDEX `income_member_idx` ON `income` (`member_id`);--> statement-breakpoint
CREATE INDEX `income_validity_idx` ON `income` (`valid_from`,`valid_until`);