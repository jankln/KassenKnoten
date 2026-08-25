import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";

/**
 * Where extensions live, and which of them are switched on.
 *
 * The directory sits inside the data volume rather than in the image: the image is
 * published and immutable, so anything written into it disappears on the next
 * `docker compose pull`. An extension somebody wrote has to outlive an upgrade.
 */

const SETTING_KEY = "extensions.enabled";

export function extensionsDir(): string {
  return process.env.EXTENSIONS_DIR ?? "/data/extensions";
}

/**
 * Whether extensions run at all.
 *
 * An extension that breaks the app also breaks the screen you would use to remove it, so
 * there has to be a way out that does not involve editing SQLite by hand. Setting
 * `EXTENSIONS_ENABLED=false` and restarting is that way.
 */
export function extensionsEnabled(): boolean {
  return process.env.EXTENSIONS_ENABLED !== "false";
}

/**
 * A safe file name for an id. Ids are restricted to lowercase letters, digits and
 * hyphens, which is what makes a path traversal impossible rather than merely unlikely.
 */
export const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/;

export function fileNameFor(id: string): string {
  if (!ID_PATTERN.test(id)) {
    throw new Error(`Refusing to use "${id}" as a file name.`);
  }
  return `${id}.mjs`;
}

/**
 * The `turbopackIgnore` comments below are not cosmetic.
 *
 * The extensions directory is a runtime path outside the project — `/data/extensions` on
 * a volume — so the compiler cannot know what is behind it. Left alone it assumes the
 * worst and traces the entire project into the standalone output, which is the image
 * every household downloads. Extensions are read at runtime by design; there is nothing
 * here for the bundler to include.
 */
export function listFiles(): string[] {
  try {
    mkdirSync(/* turbopackIgnore: true */ extensionsDir(), { recursive: true });
    return readdirSync(/* turbopackIgnore: true */ extensionsDir())
      .filter((name) => name.endsWith(".mjs"))
      .sort();
  } catch {
    return [];
  }
}

export function readSource(fileName: string): string {
  const path = join(/* turbopackIgnore: true */ extensionsDir(), fileName);
  return readFileSync(/* turbopackIgnore: true */ path, "utf8");
}

export function writeSource(id: string, source: string): string {
  const fileName = fileNameFor(id);
  mkdirSync(/* turbopackIgnore: true */ extensionsDir(), { recursive: true });
  writeFileSync(
    /* turbopackIgnore: true */ join(extensionsDir(), fileName),
    source,
    "utf8",
  );
  return fileName;
}

export function deleteSource(id: string): void {
  rmSync(/* turbopackIgnore: true */ join(extensionsDir(), fileNameFor(id)), {
    force: true,
  });
}

/* ------------------------------------------------------------------------- *
 * Which are switched on
 * ------------------------------------------------------------------------- */

type EnabledMap = Record<string, boolean>;

export function readEnabled(db: Db = getDb()): EnabledMap {
  const row = db
    .select({ value: schema.appSetting.value })
    .from(schema.appSetting)
    .where(eq(schema.appSetting.key, SETTING_KEY))
    .get();
  const value = row?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const result: EnabledMap = {};
  for (const [id, enabled] of Object.entries(value as Record<string, unknown>)) {
    if (typeof enabled === "boolean") {
      result[id] = enabled;
    }
  }
  return result;
}

export function setEnabled(id: string, enabled: boolean, db: Db = getDb()): void {
  const next = { ...readEnabled(db), [id]: enabled };
  db.insert(schema.appSetting)
    .values({ key: SETTING_KEY, value: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.appSetting.key,
      set: { value: next, updatedAt: new Date() },
    })
    .run();
}

export function forget(id: string, db: Db = getDb()): void {
  const next = { ...readEnabled(db) };
  delete next[id];
  db.insert(schema.appSetting)
    .values({ key: SETTING_KEY, value: next, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.appSetting.key,
      set: { value: next, updatedAt: new Date() },
    })
    .run();
}
