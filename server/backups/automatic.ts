import { createHash } from "node:crypto";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import { exportBackup, type BackupPayload } from "@/server/services/backup";

/**
 * Automatic backups: the file the settings screen downloads, written by the server.
 *
 * The same versioned JSON as the manual download, on purpose. It is what the restore
 * screen reads, it opens in any text editor, and since #15 it carries the household's
 * data and nothing about how this instance lets people in. A copy of the SQLite file
 * would be none of those.
 *
 * Everything here takes its directory, database and clock as arguments; the scheduler in
 * `scheduler.ts` is the only part that knows about timers.
 */

/** Once a day. A household's plan does not change faster than that in a way worth more. */
export const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

const NAME = /^kassenknoten-backup-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.json$/;

export interface StoredBackup {
  name: string;
  takenAt: Date;
  bytes: number;
}

export type BackupRun =
  | { outcome: "written"; backup: StoredBackup; pruned: string[] }
  | { outcome: "unchanged" | "not-due"; latest: StoredBackup };

/** `kassenknoten-backup-20260914T081500Z.json` — sortable, and safe on every filesystem. */
export function backupFileName(at: Date): string {
  const stamp = at
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `kassenknoten-backup-${stamp}.json`;
}

function takenAtFrom(name: string): Date | null {
  const match = NAME.exec(name);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The backups in a directory, newest first.
 *
 * Only files this module names are listed. Anything else a household keeps beside them —
 * a manual download, a note — is neither shown nor ever pruned.
 */
export function listBackups(directory: string): StoredBackup[] {
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch {
    return [];
  }
  return names
    .flatMap((name) => {
      const takenAt = takenAtFrom(name);
      if (!takenAt) {
        return [];
      }
      try {
        return [{ name, takenAt, bytes: statSync(path.join(directory, name)).size }];
      } catch {
        return [];
      }
    })
    .sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
}

/**
 * The contents of one backup, for download — or `null` for any name this module did not
 * write. The name arrives from a URL, so it is matched against the pattern before it is
 * joined to a path: `../` never reaches the filesystem.
 */
export function readBackup(directory: string, name: string): Buffer | null {
  if (!takenAtFrom(name)) {
    return null;
  }
  try {
    return readFileSync(path.join(directory, name));
  } catch {
    return null;
  }
}

/**
 * What a backup says about the household, without the moment it was taken. Two files
 * with the same fingerprint describe the same state.
 */
function fingerprint(payload: { exportedAt?: string }): string {
  const content: Record<string, unknown> = { ...payload };
  delete content.exportedAt;
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function fingerprintOfFile(file: string): string | null {
  try {
    return fingerprint(JSON.parse(readFileSync(file, "utf8")) as BackupPayload);
  } catch {
    // A file that cannot be read cannot vouch for the current state.
    return null;
  }
}

/**
 * Write a backup if one is due and something changed; then keep only the newest `keep`.
 *
 * Due means the newest backup is at least a day old, or there is none. An unchanged
 * household is not written again: fourteen kept files should be fourteen states, not
 * fourteen copies of a quiet fortnight that push the last real change out of the window.
 */
export function runAutomaticBackup(options: {
  directory: string;
  keep: number;
  db?: Db;
  now?: Date;
}): BackupRun {
  const { directory, keep, db = getDb(), now = new Date() } = options;
  const latest = listBackups(directory)[0];

  if (latest && now.getTime() - latest.takenAt.getTime() < BACKUP_INTERVAL_MS) {
    return { outcome: "not-due", latest };
  }

  const payload = exportBackup(db, now);
  if (
    latest &&
    fingerprintOfFile(path.join(directory, latest.name)) === fingerprint(payload)
  ) {
    return { outcome: "unchanged", latest };
  }

  // Owner-only: a backup is the household's finances, whoever else can list /data.
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const name = backupFileName(now);
  const target = path.join(directory, name);
  const partial = path.join(directory, `.${name}.partial`);
  const contents = `${JSON.stringify(payload, null, 2)}\n`;
  // Written beside and renamed into place, so a crash or a full disk never leaves a
  // truncated file that looks like the newest backup.
  writeFileSync(partial, contents, { mode: 0o600 });
  renameSync(partial, target);

  const pruned = listBackups(directory)
    .slice(keep)
    .map((backup) => {
      rmSync(path.join(directory, backup.name), { force: true });
      return backup.name;
    });

  return {
    outcome: "written",
    backup: {
      name,
      takenAt: takenAtFrom(name) ?? now,
      bytes: Buffer.byteLength(contents),
    },
    pruned,
  };
}
