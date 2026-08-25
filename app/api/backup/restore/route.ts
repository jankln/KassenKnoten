import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/current-session";
import {
  parseBackupJson,
  RestoreValidationError,
  restoreBackup,
} from "@/server/services/backup";
import { getMessages } from "@/server/i18n";

function unauthenticated(error: unknown): boolean {
  return error instanceof Error && error.message === "Not authenticated";
}

export async function POST(request: Request) {
  const t = getMessages();
  try {
    await requireSession();
  } catch (error) {
    if (unauthenticated(error)) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    throw error;
  }

  const form = await request.formData();
  if (form.get("confirmed") !== "true") {
    return NextResponse.json(
      { error: t.sections.settings.restoreNotConfirmed },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: t.sections.settings.restoreRequestInvalid },
      { status: 400 },
    );
  }
  if (file.size > 5_000_000) {
    return NextResponse.json(
      { error: t.sections.settings.restoreFailed },
      { status: 400 },
    );
  }

  try {
    const text = await file.text();
    restoreBackup(parseBackupJson(text));
  } catch (error) {
    if (error instanceof RestoreValidationError) {
      return NextResponse.json(
        { error: t.sections.settings.restoreFailed },
        { status: 400 },
      );
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
