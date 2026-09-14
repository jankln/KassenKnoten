import { getEnv } from "@/lib/env";
import { runAutomaticBackup } from "./automatic";

/**
 * Checks for a due backup once an hour, in the server process.
 *
 * No cron and no second container: this app is one container, and "set up a cron job
 * on the host" is a step half the households who run it would skip. The check itself is
 * cheap — a directory listing, and an export only when a day has passed — so an hourly
 * tick costs nothing and means a backup is at most an hour late after a restart.
 *
 * The first check waits a moment after start, so a server that is still migrating or
 * answering its first requests is not also exporting.
 */

const CHECK_EVERY_MS = 60 * 60 * 1000;
const FIRST_CHECK_AFTER_MS = 30 * 1000;

const started = Symbol.for("kassenknoten.backups.started");
type GlobalWithFlag = typeof globalThis & { [started]?: boolean };

export function startAutomaticBackups(): void {
  // Hot reload in development evaluates this module again; one schedule is enough.
  const global = globalThis as GlobalWithFlag;
  if (global[started]) {
    return;
  }
  global[started] = true;

  let backups;
  try {
    backups = getEnv().backups;
  } catch {
    // A misconfigured instance reports that loudly on its first request; a backup timer
    // is not the place to say it a second time.
    return;
  }
  if (!backups) {
    console.log("[backup] automatic backups are off (BACKUP_KEEP=0).");
    return;
  }
  const { directory, keep } = backups;

  const check = () => {
    try {
      const result = runAutomaticBackup({ directory, keep });
      if (result.outcome === "written") {
        console.log(
          `[backup] wrote ${result.backup.name}` +
            (result.pruned.length > 0 ? `, removed ${result.pruned.length} older` : ""),
        );
      }
    } catch (error) {
      // A failed backup must not take the application down with it — but it must not be
      // quiet either. The next check tries again.
      console.error(`[backup] could not write a backup to ${directory}:`, error);
    }
  };

  setTimeout(check, FIRST_CHECK_AFTER_MS).unref();
  setInterval(check, CHECK_EVERY_MS).unref();
}
