import type { Db } from "@/db/client";
import type { Period } from "@/lib/domain/period";
import type { HouseholdSummary } from "@/lib/domain/summary";

/**
 * What an extension is, and what it may do.
 *
 * An extension runs **on the server, inside this process, with full access** to the
 * household's database. That was a deliberate choice, and nothing here pretends
 * otherwise: there is no sandbox, no permission list and no boundary to be defeated.
 * Installing one is installing software on your server, and the upload form says so in
 * those words.
 */

/** The version of this contract. An extension declaring another number is not loaded. */
export const EXTENSION_API_VERSION = 1;

export interface ExtensionManifest {
  /** Unique, lowercase, used as the file name. */
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  /** Must equal EXTENSION_API_VERSION. */
  apiVersion: number;
}

/** One line of a card: a label on the left, a value on the right. */
export interface CardRow {
  label: string;
  value: string;
  /** Colours the value the way the rest of the app colours money. */
  tone?: "positive" | "negative" | "muted";
}

export interface CardContent {
  rows: CardRow[];
  /** A sentence under the rows, for context the rows cannot carry. */
  note?: string;
}

/** What a card is given when the dashboard renders it. */
export interface CardContext {
  period: Period;
  summary: HouseholdSummary;
  db: Db;
}

export interface DashboardCard {
  id: string;
  title: string;
  render: (context: CardContext) => CardContent | null;
}

/**
 * The object handed to `register`.
 *
 * `db`, `schema` and `services` are the real ones, not copies: this is what "full access"
 * means. `domain` and `format` are there so an extension computes money the same way the
 * app does — an extension that rounds differently is an extension that disagrees with
 * every other figure on the screen.
 */
export interface ExtensionApi {
  apiVersion: number;
  manifest: ExtensionManifest;
  db: Db;
  schema: typeof import("@/db/schema");
  services: {
    dashboard: typeof import("@/server/services/dashboard");
    expenses: typeof import("@/server/services/expenses");
    variableCosts: typeof import("@/server/services/variable-costs");
    savings: typeof import("@/server/services/savings");
    members: typeof import("@/server/services/members");
  };
  domain: {
    money: typeof import("@/lib/domain/money");
    split: typeof import("@/lib/domain/split");
    period: typeof import("@/lib/domain/period");
    interval: typeof import("@/lib/domain/interval");
  };
  format: typeof import("@/lib/format");
  /** Anything written here is prefixed with the extension's id in the server log. */
  log: (...values: unknown[]) => void;
  registerDashboardCard: (card: DashboardCard) => void;
}

/** The shape a `.mjs` extension file has to export. */
export interface ExtensionModule {
  manifest: ExtensionManifest;
  register: (api: ExtensionApi) => void | Promise<void>;
}

/** An extension as the settings screen sees it. */
export interface InstalledExtension {
  manifest: ExtensionManifest;
  enabled: boolean;
  /** Present when loading it threw; the extension contributes nothing in that case. */
  error?: string;
  fileName: string;
}
