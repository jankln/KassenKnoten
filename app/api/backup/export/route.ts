import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/current-session";
import { exportBackup, exportPlanningCsv } from "@/server/services/backup";

function unauthenticated(error: unknown): boolean {
  return error instanceof Error && error.message === "Not authenticated";
}

export async function GET(request: NextRequest) {
  try {
    await requireSession();
  } catch (error) {
    if (unauthenticated(error)) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    throw error;
  }

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  if (format === "json") {
    const payload = exportBackup();
    return new NextResponse(`${JSON.stringify(payload, null, 2)}\n`, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="kassenknoten-backup.json"',
        "Cache-Control": "no-store",
      },
    });
  }
  if (format === "csv") {
    return new NextResponse(exportPlanningCsv(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="kassenknoten-plan.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ error: "Unsupported export format." }, { status: 400 });
}
