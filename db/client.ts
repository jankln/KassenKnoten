import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { seedSystemData } from "./seed";

export type Db = ReturnType<typeof createDb>["db"];

const MIGRATIONS_FOLDER = "db/migrations";

/**
 * Open a database, apply pragmas, migrate it and seed the rows the app cannot run
 * without. Exported separately from `getDb()` so tests can work on a throwaway file.
 */
export function createDb(path: string) {
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const sqlite = new Database(path);

  // Referential integrity is off by default in SQLite and has to be enabled per
  // connection — without this, every ON DELETE CASCADE in the schema is decoration.
  sqlite.pragma("foreign_keys = ON");
  if (path !== ":memory:") {
    // WAL keeps reads from blocking the single writer, which is all a household needs.
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
  }
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle(sqlite, { schema });

  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  seedSystemData(db);

  return { db, sqlite };
}

let instance: Db | undefined;

/**
 * The application's database handle. Migrations run on first access, so a fresh
 * container comes up with a ready database and no manual step.
 */
export function getDb(): Db {
  instance ??= createDb(process.env.DATABASE_PATH ?? "./data/kassenknoten.db").db;
  return instance;
}
