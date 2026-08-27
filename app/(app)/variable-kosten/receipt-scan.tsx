"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { useMessages } from "@/components/providers/messages-provider";
import type { ReceiptDraft } from "@/lib/domain/receipt";
import type { Period } from "@/lib/domain/period";
import { formatPeriod } from "@/lib/format";
import { addBooking } from "./actions";

/** A budget a receipt can be booked against, as the picker needs it. */
export interface ScanTarget {
  id: number;
  label: string;
  scope: "private" | "shared";
  /** Only a detailed budget counts its receipts; the picker says so when it matters. */
  detailed: boolean;
  /** The owner's name, for a private budget. */
  memberName: string | null;
}

/**
 * The long edge the photo is scaled to before it is sent.
 *
 * A receipt is tall and its print is small, so this is generous where a document scanner
 * would not be: at 2000 px a line of a supermarket receipt is still around twenty pixels
 * high, which is roughly where Tesseract stops guessing. Below that the saving is a few
 * hundred kilobytes and the cost is the total.
 */
const MAX_EDGE = 2000;

/**
 * Shrink a phone photo in the browser.
 *
 * Three jobs, all of which the server would do worse or not at all: twelve megapixels
 * become a few hundred kilobytes over a home uplink, EXIF rotation is baked in so a
 * receipt photographed sideways arrives upright, and colour is dropped because it
 * carries nothing an OCR engine reads.
 *
 * Every failure path returns the original file. A browser that cannot do this should
 * make the upload slower, never impossible.
 */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }
    context.filter = "grayscale(1)";
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.85);
    });
    return blob ?? file;
  } catch {
    return file;
  }
}

type State =
  | { step: "idle" }
  | { step: "reading" }
  | { step: "draft"; draft: ReceiptDraft }
  | { step: "failed"; message: string };

/**
 * Book a receipt by photographing it.
 *
 * The flow is built around the one thing the paper cannot know. A receipt carries the
 * total, the date and the shop; it does not carry whether this was Alex's coffee or the
 * household's weekly shop, and `docs/PLAN.md` is explicit that anything touching a split
 * is a deliberate choice rather than an inference. So the picker opens empty and the
 * three fields the photo *can* answer arrive filled in.
 *
 * Filled in, and never silently. A field the parser could not read stays empty with a
 * line saying so, and a total that was inferred rather than read off a "SUMME" line is
 * marked for a second look — because nobody re-reads a number a machine typed for them
 * unless the interface asks.
 *
 * The file input has no `capture` attribute on purpose. `accept="image/*"` already puts
 * the camera in the OS sheet on both mobile platforms, and it leaves
 * `Permissions-Policy: camera=()` in `proxy.ts` true exactly as written.
 */
export function ReceiptScan({
  targets,
  period,
  autoOpen = false,
}: {
  targets: ScanTarget[];
  period: Period;
  /**
   * Open the sheet straight away — the launcher shortcut arriving at `?scan=1`.
   *
   * It opens the sheet rather than the file picker, because a picker may only be opened
   * by a real gesture; a navigation is not one, and browsers block it. So the shortcut
   * saves the step it honestly can: the household lands on the sheet, reads what happens
   * to the photo, and taps once.
   */
  autoOpen?: boolean;
}) {
  const t = useMessages();
  const copy = t.sections.receipt;
  const bookingCopy = t.sections.variableCosts;

  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(autoOpen);
  const [state, setState] = useState<State>({ step: "idle" });
  const [targetId, setTargetId] = useState("");
  const [bookedOn, setBookedOn] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  async function read(file: File) {
    setOpen(true);
    setState({ step: "reading" });
    setError(undefined);

    const body = new FormData();
    body.set("image", await downscale(file), "receipt.webp");
    // The household's day is the one on the device in their hand, not the container's.
    body.set("today", new Date().toLocaleDateString("sv-SE"));

    try {
      const response = await fetch("/api/receipt", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) {
        setState({ step: "failed", message: payload?.error ?? copy.failed });
        return;
      }
      const draft = payload as ReceiptDraft;
      setBookedOn(draft.bookedOn ?? `${period}-01`);
      setState({ step: "draft", draft });
    } catch {
      setState({ step: "failed", message: copy.failed });
    }
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await addBooking(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setState({ step: "idle" });
      toast(copy.saved);
    });
  }

  const target = targets.find((entry) => String(entry.id) === targetId);
  const inOtherMonth = bookedOn.length === 10 && bookedOn.slice(0, 7) !== period;
  const readAnything =
    state.step === "draft" &&
    (state.draft.amountCents !== null ||
      state.draft.bookedOn !== null ||
      state.draft.label !== null);

  const privateTargets = targets.filter((entry) => entry.scope === "private");
  const sharedTargets = targets.filter((entry) => entry.scope === "shared");

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="sr-only"
        // The same photo picked twice in a row must scan twice, and a file input fires
        // no change event when the value has not changed.
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            void read(file);
          }
        }}
      />

      <Button
        type="button"
        variant="primary"
        onClick={() => fileInput.current?.click()}
      >
        <ScanLine className="size-4" aria-hidden />
        {copy.scan}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setState({ step: "idle" });
            setTargetId("");
            setError(undefined);
          }
        }}
      >
        <DialogContent title={copy.title} description={copy.privacy}>
          {state.step === "reading" ? (
            <p
              aria-live="polite"
              className="text-ink-muted flex items-center gap-3 py-8 text-sm"
            >
              <Loader2 className="text-brass size-5 animate-spin" aria-hidden />
              {copy.reading}
            </p>
          ) : state.step === "failed" ? (
            <div className="space-y-4 py-2">
              <p role="alert" className="text-negative text-sm">
                {state.message}
              </p>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    {t.actions.cancel}
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInput.current?.click()}
                >
                  {copy.anotherPhoto}
                </Button>
              </div>
            </div>
          ) : state.step === "draft" ? (
            <form action={submit} className="space-y-4">
              {/* The one decision the receipt cannot make. It is first because it is the
                  only field that is not already answered. */}
              <Field label={copy.budget} htmlFor="scan-target">
                <Select
                  id="scan-target"
                  name="variableCostId"
                  required
                  value={targetId}
                  onChange={(event) => setTargetId(event.target.value)}
                >
                  <option value="" disabled>
                    {copy.budgetPlaceholder}
                  </option>
                  {privateTargets.length > 0 ? (
                    <optgroup label={bookingCopy.private}>
                      {privateTargets.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.memberName
                            ? `${entry.memberName} · ${entry.label}`
                            : entry.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {sharedTargets.length > 0 ? (
                    <optgroup label={bookingCopy.shared}>
                      {sharedTargets.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </Select>
              </Field>

              {target && !target.detailed ? (
                <p className="text-ink-muted text-sm">
                  {copy.planCounts(target.label)}
                </p>
              ) : null}

              {/* Said once, at the top, rather than repeated under every field it
                  applies to. Below, a field only speaks up when something about it is
                  worth stopping for. */}
              {readAnything ? (
                <p className="text-ink-muted text-sm">{copy.readFromReceipt}</p>
              ) : null}

              <Field
                label={bookingCopy.bookingAmount}
                htmlFor="scan-amount"
                hint={
                  state.draft.amountCents === null
                    ? copy.noAmount
                    : state.draft.amountSource === "total"
                      ? undefined
                      : copy.checkAmount
                }
                error={error}
              >
                <MoneyInput
                  id="scan-amount"
                  name="amountCents"
                  defaultCents={state.draft.amountCents ?? undefined}
                  required
                />
              </Field>

              <Field
                label={bookingCopy.bookingDate}
                htmlFor="scan-date"
                hint={
                  state.draft.bookedOn === null
                    ? copy.noDate
                    : inOtherMonth
                      ? copy.otherMonth(formatPeriod(bookedOn.slice(0, 7)))
                      : undefined
                }
              >
                <Input
                  id="scan-date"
                  name="bookedOn"
                  type="date"
                  required
                  value={bookedOn}
                  onChange={(event) => setBookedOn(event.target.value)}
                />
              </Field>

              <Field label={bookingCopy.bookingLabel} htmlFor="scan-label">
                <Input
                  id="scan-label"
                  name="label"
                  defaultValue={state.draft.label ?? ""}
                  placeholder={bookingCopy.bookingLabelPlaceholder}
                  maxLength={60}
                  autoComplete="off"
                />
              </Field>

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => fileInput.current?.click()}
                >
                  {copy.anotherPhoto}
                </Button>
                <Button type="submit" variant="primary" disabled={pending}>
                  {t.actions.save}
                </Button>
              </div>
            </form>
          ) : (
            // Nothing picked yet: the sheet opened from the launcher shortcut.
            <div className="flex justify-end py-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => fileInput.current?.click()}
              >
                <ScanLine className="size-4" aria-hidden />
                {copy.choosePhoto}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
