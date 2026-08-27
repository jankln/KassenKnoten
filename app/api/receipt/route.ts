import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/current-session";
import { parseReceipt, type ReceiptDraft } from "@/lib/domain/receipt";
import { getLocale, getMessages } from "@/server/i18n";
import { MAX_IMAGE_BYTES, recogniseReceipt } from "@/server/receipts/ocr";

/**
 * Read a photographed receipt into a draft booking.
 *
 * A route handler rather than a server action, for one practical reason: a server action
 * accepts a megabyte of body by default, and raising that limit would raise it for every
 * form in the application to buy one upload. The image arrives, is recognised, and is
 * dropped when this function returns — it is never written anywhere, and the response
 * carries text, not a picture.
 *
 * `proxy.ts` denies everything that is not explicitly public, so an unauthenticated
 * request never reaches this file. The check is repeated here anyway, because the proxy
 * is never allowed to be the only gate.
 */

function unauthenticated(error: unknown): boolean {
  return error instanceof Error && error.message === "Not authenticated";
}

export interface ReceiptScanResponse extends ReceiptDraft {
  /** Tesseract's own confidence, 0–100. Low means "look at every field". */
  confidence: number;
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
  const file = form.get("image");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: t.sections.receipt.notAnImage }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: t.sections.receipt.tooLarge }, { status: 400 });
  }

  // `today` comes from the browser, and deliberately so: the household's day is the one
  // on the phone in their hand, not the container's UTC. It only ever narrows which
  // dates are plausible, so a wrong value costs a date field, never a wrong amount.
  const today = form.get("today");
  const reference =
    typeof today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(today)
      ? today
      : new Date().toISOString().slice(0, 10);

  const image = Buffer.from(await file.arrayBuffer());

  try {
    const { text, confidence } = await recogniseReceipt(image, getLocale());
    const draft = parseReceipt(text, reference);
    return NextResponse.json({ ...draft, confidence } satisfies ReceiptScanResponse, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Recognition failing is a machine problem, not a household one. The interface says
    // the scan did not work and leaves the form open to be filled in by hand.
    return NextResponse.json({ error: t.sections.receipt.failed }, { status: 500 });
  }
}
