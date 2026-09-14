import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/current-session";
import { getEnv } from "@/lib/env";
import { readBackup } from "@/server/backups/automatic";

/**
 * Download one automatic backup.
 *
 * Behind a session like every other route, and checked again here. The name comes from
 * the URL, and `readBackup` answers only names it writes itself — so this serves the
 * backups directory's own files and nothing a crafted path could reach beside them.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/backup/automatic/[name]">,
) {
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    throw error;
  }

  const { name } = await context.params;
  const backups = getEnv().backups;
  const contents = backups ? readBackup(backups.directory, name) : null;
  if (!contents) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(contents), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
