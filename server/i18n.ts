import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  DEFAULT_LOCALE,
  isLocale,
  messagesFor,
  type Locale,
  type Messages,
} from "@/lib/i18n";

/**
 * The active language, on the server.
 *
 * Synchronous on purpose. SQLite reads are synchronous here, so nothing about looking up
 * one column needs to be awaited — and that matters far beyond convenience: zod schemas,
 * formatting helpers and message lookups all happen in ordinary function bodies, and an
 * async accessor would have turned every one of them into a promise.
 *
 * Read straight from the handle each time rather than memoised. One indexed lookup of a
 * single column costs microseconds, and a cache keyed on a default argument is a cache
 * that hands one caller's database to another — which is precisely how a service given an
 * explicit handle ends up reporting the language of a different one.
 *
 * A database that is not ready yet — the very first request of a fresh container,
 * mid-migration — falls back to English rather than failing a render over a language.
 */
export function getLocale(db: Db = getDb()): Locale {
  try {
    const row = db
      .select({ locale: schema.household.locale })
      .from(schema.household)
      .where(eq(schema.household.id, 1))
      .get();
    return isLocale(row?.locale) ? row.locale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** The messages for the household's language. */
export function getMessages(db?: Db): Messages {
  return messagesFor(getLocale(db));
}

export function setLocale(locale: Locale, db: Db = getDb()): void {
  db.update(schema.household)
    .set({ locale, updatedAt: new Date() })
    .where(eq(schema.household.id, 1))
    .run();
}
