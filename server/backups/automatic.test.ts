import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import { parseBackupJson } from "@/server/services/backup";
import {
  backupFileName,
  BACKUP_INTERVAL_MS,
  listBackups,
  readBackup,
  runAutomaticBackup,
} from "./automatic";

let handle: ReturnType<typeof createDb>;
let directory: string;

const DAY = BACKUP_INTERVAL_MS;
const start = new Date("2026-09-14T08:15:00.000Z");
const later = (ms: number) => new Date(start.getTime() + ms);

beforeEach(() => {
  handle = createDb(":memory:");
  directory = path.join(mkdtempSync(path.join(tmpdir(), "kk-backups-")), "backups");
});

afterEach(() => {
  handle.sqlite.close();
  rmSync(path.dirname(directory), { recursive: true, force: true });
});

function addMember(name: string) {
  handle.db.insert(schema.member).values({ name, colorIndex: 1 }).run();
}

const run = (now: Date, keep = 14) =>
  runAutomaticBackup({ directory, keep, db: handle.db, now });

describe("runAutomaticBackup", () => {
  it("writes the first backup at once, as a file the restore screen accepts", () => {
    addMember("Alex");

    const result = run(start);

    expect(result.outcome).toBe("written");
    const files = readdirSync(directory);
    expect(files).toEqual(["kassenknoten-backup-20260914T081500Z.json"]);
    const restored = parseBackupJson(
      readBackup(directory, files[0]!)!.toString("utf8"),
    );
    expect(restored.members.map((member) => member.name)).toEqual(["Alex"]);
  });

  it("keeps the file readable by its owner only", () => {
    run(start);
    const [file] = readdirSync(directory);
    expect(statSync(path.join(directory, file!)).mode & 0o077).toBe(0);
  });

  it("waits a day before the next one", () => {
    run(start);
    addMember("Robin");

    expect(run(later(DAY - 60_000)).outcome).toBe("not-due");
    expect(run(later(DAY)).outcome).toBe("written");
    expect(listBackups(directory)).toHaveLength(2);
  });

  it("does not write a household that has not changed", () => {
    addMember("Alex");
    run(start);

    const result = run(later(3 * DAY));

    expect(result).toMatchObject({ outcome: "unchanged" });
    expect(listBackups(directory)).toHaveLength(1);
  });

  it("keeps the newest, prunes the rest, and never touches files it did not name", () => {
    writeFileSync(path.join(path.dirname(directory), "placeholder"), "");
    for (let day = 0; day < 5; day++) {
      addMember(`Person ${day}`);
      run(later(day * DAY), 3);
    }
    writeFileSync(path.join(directory, "manual-download.json"), "{}");
    addMember("One more");

    const result = run(later(5 * DAY), 3);

    expect(result.outcome === "written" && result.pruned).toEqual([
      backupFileName(later(2 * DAY)),
    ]);
    expect(readdirSync(directory).sort()).toEqual(
      [
        "manual-download.json",
        backupFileName(later(3 * DAY)),
        backupFileName(later(4 * DAY)),
        backupFileName(later(5 * DAY)),
      ].sort(),
    );
  });

  it("writes again when the newest file cannot be read", () => {
    run(start);
    const [file] = readdirSync(directory);
    writeFileSync(path.join(directory, file!), "truncated {");

    expect(run(later(DAY)).outcome).toBe("written");
  });
});

describe("readBackup", () => {
  it("serves only names it writes", () => {
    run(start);
    writeFileSync(path.join(path.dirname(directory), "secret.json"), "{}");

    for (const name of [
      "../secret.json",
      "secret.json",
      "kassenknoten-backup-x.json",
      "",
    ]) {
      expect(readBackup(directory, name)).toBeNull();
    }
    expect(readBackup(directory, backupFileName(start))).not.toBeNull();
  });
});

describe("listBackups", () => {
  it("is empty, not an error, before the directory exists", () => {
    expect(listBackups(path.join(directory, "missing"))).toEqual([]);
  });
});
