import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

/**
 * Conventions used throughout this schema:
 *
 * - Money is stored in **integer cents**. Never a float, never a formatted string.
 * - Percentages are stored in **basis points** (`_bp`, 10000 = 100 %).
 * - Recurrence is a single `interval_months` integer (1 = monthly, 12 = yearly, ...).
 *   The German label is derived in the UI, so there is no second field to disagree with.
 * - Rows are retired with `active = 0` rather than deleted, so historical snapshots keep
 *   resolving to real names and an accidental delete stays undoable.
 */

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
};

/**
 * The months an entry is valid for. `valid_until` is inclusive and nullable, because a
 * salary or a rent normally has no planned end.
 *
 * This is what makes the history real: raising a salary in March closes the old row at
 * February and opens a new one, so February keeps reporting what February actually was.
 */
const validity = {
  validFrom: text("valid_from").notNull(),
  validUntil: text("valid_until"),
};

const validityChecks = (t: {
  validFrom: AnySQLiteColumn;
  validUntil: AnySQLiteColumn;
}) =>
  [
    sql`${t.validFrom} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]'`,
    sql`${t.validUntil} is null or (${t.validUntil} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]' and ${t.validUntil} >= ${t.validFrom})`,
  ] as const;

export const SPLIT_MODES = ["fixed_quota", "income_ratio"] as const;
export type SplitMode = (typeof SPLIT_MODES)[number];

export const EXPENSE_SCOPES = ["private", "shared"] as const;
export type ExpenseScope = (typeof EXPENSE_SCOPES)[number];

export const INCOME_KINDS = ["salary", "other"] as const;
export type IncomeKind = (typeof INCOME_KINDS)[number];

/**
 * How a variable cost is counted.
 *
 * `plan` counts the planned figure and nothing else — "300 € fürs Essen" is the number
 * that reaches the dashboard whether or not anyone writes down a receipt. `detailed`
 * counts what was actually booked in that month, so the planned figure becomes a budget
 * to compare against rather than the figure itself.
 */
export const VARIABLE_MODES = ["plan", "detailed"] as const;
export type VariableMode = (typeof VARIABLE_MODES)[number];

/**
 * Exactly one row, id 1. An instance hosts a single household by design — see
 * docs/PLAN.md section 1.
 */
export const household = sqliteTable(
  "household",
  {
    id: integer("id").primaryKey({ autoIncrement: false }),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("EUR"),
    /** Pre-fills the split picker for new shared expenses; never applied silently. */
    defaultSplitMode: text("default_split_mode", { enum: SPLIT_MODES })
      .notNull()
      .default("fixed_quota"),
    /** The interface language for everyone in this household. See lib/i18n. */
    locale: text("locale").notNull().default("en"),
    onboardingDone: integer("onboarding_done", { mode: "boolean" })
      .notNull()
      .default(false),
    ...timestamps,
  },
  (t) => [check("household_singleton", sql`${t.id} = 1`)],
);

export const member = sqliteTable("member", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  /** 1..5, picks the --color-member-N accent used for this person everywhere. */
  colorIndex: integer("color_index").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

/**
 * The household default quota, one row per member. Only consulted when a shared
 * expense uses `fixed_quota` without its own shares.
 */
export const defaultShare = sqliteTable(
  "default_share",
  {
    memberId: integer("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    shareBp: integer("share_bp").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.memberId] }),
    check("default_share_range", sql`${t.shareBp} between 0 and 10000`),
  ],
);

export const income = sqliteTable(
  "income",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: text("kind", { enum: INCOME_KINDS }).notNull().default("salary"),
    amountCents: integer("amount_cents").notNull().default(0),
    intervalMonths: integer("interval_months").notNull().default(1),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...validity,
    ...timestamps,
  },
  (t) => [
    index("income_member_idx").on(t.memberId),
    index("income_validity_idx").on(t.validFrom, t.validUntil),
    check("income_amount_nonnegative", sql`${t.amountCents} >= 0`),
    check("income_interval_positive", sql`${t.intervalMonths} > 0`),
    check("income_valid_from_format", validityChecks(t)[0]),
    check("income_valid_until_range", validityChecks(t)[1]),
  ],
);

export const category = sqliteTable(
  "category",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    /** lucide-react icon name, e.g. "house". */
    icon: text("icon").notNull().default("circle"),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Seeded categories cannot be deleted, only renamed. */
    isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("category_name_unique").on(t.name)],
);

/**
 * A recurring fixed cost. `scope = 'private'` belongs to exactly one member and is not
 * split; `scope = 'shared'` is split between members and therefore requires a split mode.
 */
export const expense = sqliteTable(
  "expense",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scope: text("scope", { enum: EXPENSE_SCOPES }).notNull(),
    memberId: integer("member_id").references(() => member.id, {
      onDelete: "cascade",
    }),
    label: text("label").notNull(),
    categoryId: integer("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    amountCents: integer("amount_cents").notNull().default(0),
    intervalMonths: integer("interval_months").notNull().default(1),
    /** Month of the year (1-12) the charge lands in, for non-monthly intervals. */
    dueMonth: integer("due_month"),
    splitMode: text("split_mode", { enum: SPLIT_MODES }),
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...validity,
    ...timestamps,
  },
  (t) => [
    index("expense_scope_idx").on(t.scope, t.active),
    index("expense_member_idx").on(t.memberId),
    index("expense_validity_idx").on(t.validFrom, t.validUntil),
    check("expense_valid_from_format", validityChecks(t)[0]),
    check("expense_valid_until_range", validityChecks(t)[1]),
    check("expense_amount_nonnegative", sql`${t.amountCents} >= 0`),
    check("expense_interval_positive", sql`${t.intervalMonths} > 0`),
    check(
      "expense_due_month_range",
      sql`${t.dueMonth} is null or ${t.dueMonth} between 1 and 12`,
    ),
    // A private expense has an owner and no split; a shared one is the other way round.
    check(
      "expense_scope_shape",
      sql`(${t.scope} = 'private' and ${t.memberId} is not null and ${t.splitMode} is null)
          or (${t.scope} = 'shared' and ${t.memberId} is null and ${t.splitMode} is not null)`,
    ),
  ],
);

/**
 * Per-expense override of the fixed quota. Absent rows mean "use the household default".
 * Shares of one expense must add up to 10000 bp; that invariant is enforced in the
 * service layer, because SQLite cannot express a cross-row CHECK.
 */
export const expenseShare = sqliteTable(
  "expense_share",
  {
    expenseId: integer("expense_id")
      .notNull()
      .references(() => expense.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    shareBp: integer("share_bp").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.expenseId, t.memberId] }),
    check("expense_share_range", sql`${t.shareBp} between 0 and 10000`),
  ],
);

/**
 * A variable cost: one budget for something that is not the same every month.
 *
 * Deliberately a separate table from `expense` rather than a flag on it. A fixed cost is
 * an amount and a rhythm; a variable one is a budget that may or may not have receipts
 * hanging off it, and `interval_months` means nothing to it. Merging the two would have
 * given every fixed cost three columns it can never use, and every query a branch.
 *
 * Scope and split work exactly as they do for fixed costs, and for the same reason: the
 * per-person figures on the dashboard are only right if every cost knows whose it is.
 */
export const variableCost = sqliteTable(
  "variable_cost",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scope: text("scope", { enum: EXPENSE_SCOPES }).notNull(),
    memberId: integer("member_id").references(() => member.id, {
      onDelete: "cascade",
    }),
    label: text("label").notNull(),
    categoryId: integer("category_id").references(() => category.id, {
      onDelete: "set null",
    }),
    mode: text("mode", { enum: VARIABLE_MODES }).notNull().default("plan"),
    /** The monthly figure. In `detailed` mode it is the budget the bookings run against. */
    plannedCents: integer("planned_cents").notNull().default(0),
    splitMode: text("split_mode", { enum: SPLIT_MODES }),
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...validity,
    ...timestamps,
  },
  (t) => [
    index("variable_cost_scope_idx").on(t.scope, t.active),
    index("variable_cost_member_idx").on(t.memberId),
    index("variable_cost_validity_idx").on(t.validFrom, t.validUntil),
    check("variable_cost_valid_from_format", validityChecks(t)[0]),
    check("variable_cost_valid_until_range", validityChecks(t)[1]),
    check("variable_cost_planned_nonnegative", sql`${t.plannedCents} >= 0`),
    check(
      "variable_cost_scope_shape",
      sql`(${t.scope} = 'private' and ${t.memberId} is not null and ${t.splitMode} is null)
          or (${t.scope} = 'shared' and ${t.memberId} is null and ${t.splitMode} is not null)`,
    ),
  ],
);

/** Per-budget override of the fixed quota, mirroring `expense_share`. */
export const variableCostShare = sqliteTable(
  "variable_cost_share",
  {
    variableCostId: integer("variable_cost_id")
      .notNull()
      .references(() => variableCost.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    shareBp: integer("share_bp").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.variableCostId, t.memberId] }),
    check("variable_cost_share_range", sql`${t.shareBp} between 0 and 10000`),
  ],
);

/**
 * One receipt against a variable cost.
 *
 * This is the only place in the schema that knows about days. A booking belongs to the
 * month its date falls in, which is what makes `detailed` mode add up per month; the day
 * itself is kept because "wann war das?" is the first question anyone asks of a list of
 * amounts.
 *
 * It carries no split of its own on purpose — the budget above it decides who pays what,
 * so a shopping trip cannot quietly be divided differently from the budget it belongs to.
 */
export const variableBooking = sqliteTable(
  "variable_booking",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    variableCostId: integer("variable_cost_id")
      .notNull()
      .references(() => variableCost.id, { onDelete: "cascade" }),
    /** ISO day, `YYYY-MM-DD`. The month it falls in is the month it counts for. */
    bookedOn: text("booked_on").notNull(),
    label: text("label"),
    amountCents: integer("amount_cents").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("variable_booking_cost_idx").on(t.variableCostId, t.bookedOn),
    check(
      "variable_booking_date_format",
      sql`${t.bookedOn} glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`,
    ),
    check("variable_booking_amount_nonnegative", sql`${t.amountCents} >= 0`),
  ],
);

/** A savings goal. `ownerMemberId = null` means the pot belongs to the household. */
export const savingsPot = sqliteTable(
  "savings_pot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    ownerMemberId: integer("owner_member_id").references(() => member.id, {
      onDelete: "cascade",
    }),
    monthlyRateCents: integer("monthly_rate_cents").notNull().default(0),
    balanceCents: integer("balance_cents").notNull().default(0),
    targetCents: integer("target_cents"),
    note: text("note"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    ...timestamps,
  },
  (t) => [
    check("savings_rate_nonnegative", sql`${t.monthlyRateCents} >= 0`),
    check(
      "savings_target_positive",
      sql`${t.targetCents} is null or ${t.targetCents} > 0`,
    ),
  ],
);

/**
 * A frozen month. Written once, when the first request of a new month notices that the
 * previous month has not been recorded yet — no scheduler involved.
 */
export const snapshot = sqliteTable(
  "snapshot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** ISO year and month, e.g. "2026-08". */
    period: text("period").notNull(),
    takenAt: integer("taken_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    incomeCents: integer("income_cents").notNull(),
    fixedPrivateCents: integer("fixed_private_cents").notNull(),
    fixedSharedCents: integer("fixed_shared_cents").notNull(),
    savingsRateCents: integer("savings_rate_cents").notNull(),
    savingsBalanceCents: integer("savings_balance_cents").notNull(),
    freeCashCents: integer("free_cash_cents").notNull(),
  },
  (t) => [uniqueIndex("snapshot_period_unique").on(t.period)],
);

export const snapshotMember = sqliteTable(
  "snapshot_member",
  {
    snapshotId: integer("snapshot_id")
      .notNull()
      .references(() => snapshot.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    /** Denormalised so a renamed or removed member does not rewrite history. */
    memberName: text("member_name").notNull(),
    incomeCents: integer("income_cents").notNull(),
    ownFixedCents: integer("own_fixed_cents").notNull(),
    sharedShareCents: integer("shared_share_cents").notNull(),
    remainderCents: integer("remainder_cents").notNull(),
  },
  (t) => [primaryKey({ columns: [t.snapshotId, t.memberId] })],
);

/** Small key/value store for operational state, e.g. the last snapshot run. */
export const appSetting = sqliteTable("app_setting", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Household = typeof household.$inferSelect;
export type Member = typeof member.$inferSelect;
export type Income = typeof income.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Expense = typeof expense.$inferSelect;
export type ExpenseShare = typeof expenseShare.$inferSelect;
export type VariableCost = typeof variableCost.$inferSelect;
export type VariableCostShare = typeof variableCostShare.$inferSelect;
export type VariableBooking = typeof variableBooking.$inferSelect;
export type SavingsPot = typeof savingsPot.$inferSelect;
export type Snapshot = typeof snapshot.$inferSelect;
export type SnapshotMember = typeof snapshotMember.$inferSelect;
