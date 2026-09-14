/**
 * Runs once when a server starts.
 *
 * Only the Node.js runtime schedules backups — they need the filesystem and the database
 * — and never while `next build` collects page data, when there is no instance to back up.
 */
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { startAutomaticBackups } = await import("./server/backups/scheduler");
    startAutomaticBackups();
  }
}
