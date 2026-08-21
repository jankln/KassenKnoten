import type { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type AnyDb = ReturnType<typeof drizzle>;

/**
 * Categories every household starts with. Names are user-facing, therefore German;
 * icons are lucide-react identifiers. They are marked as system categories, which
 * means they can be renamed but not deleted.
 */
export const SYSTEM_CATEGORIES: ReadonlyArray<{ name: string; icon: string }> = [
  { name: "Wohnen", icon: "house" },
  { name: "Telefon & Internet", icon: "wifi" },
  { name: "Versicherung", icon: "shield" },
  { name: "Fortbewegung", icon: "train-front" },
  { name: "Lebensmittel", icon: "shopping-basket" },
  { name: "Gesundheit", icon: "heart-pulse" },
  { name: "Sport", icon: "dumbbell" },
  { name: "Streaming", icon: "play" },
  { name: "Software", icon: "monitor" },
  { name: "Unterhaltung", icon: "ticket" },
  { name: "Mitgliedschaft", icon: "users" },
  { name: "Sonstiges", icon: "circle-dashed" },
];

/**
 * Idempotently create the rows the app cannot function without: the singleton
 * household and the system categories. Safe to call on every boot.
 */
export function seedSystemData(db: AnyDb): void {
  db.insert(schema.household)
    .values({ id: 1, name: "Haushalt" })
    .onConflictDoNothing()
    .run();

  db.insert(schema.category)
    .values(
      SYSTEM_CATEGORIES.map((entry, index) => ({
        name: entry.name,
        icon: entry.icon,
        sortOrder: index,
        isSystem: true,
      })),
    )
    .onConflictDoNothing({ target: schema.category.name })
    .run();
}
