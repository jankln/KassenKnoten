"use client";

import { useId, useState } from "react";
import { Field, Input } from "@/components/ui/field";
import {
  isPeriod,
  nextPeriod,
  periodFromDate,
  previousPeriod,
} from "@/lib/domain/period";
import { formatCents, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMessages } from "@/components/providers/messages-provider";

/**
 * The months an entry applies to, and — while editing an amount — what changing it means.
 *
 * The hard part is not storing a date range, it is that "Alex earns more now" and "I
 * typed the wrong number" are the same keystrokes and opposite intentions. Inferring it
 * from whether the user happened to move a date field puts the safe outcome behind a
 * step they have no reason to take, and silently rewrites history when they skip it.
 *
 * So as soon as the amount differs from the stored one, the intention becomes an explicit
 * choice, preselected on the one that keeps the old value, with a preview of the rows
 * that will exist afterwards. The server does the rest: it already splits an entry whose
 * start moves forward.
 *
 * `type="month"` is the one native control that returns `YYYY-MM` directly and brings its
 * own keyboard on a phone.
 */
export function ValidityFields({
  defaultFrom,
  defaultUntil,
  currentFrom,
  currentAmountCents,
  amountCents,
}: {
  defaultFrom: string;
  defaultUntil?: string | null;
  /** The month an existing entry starts at. Absent when creating one. */
  currentFrom?: string;
  /** The amount stored for an existing entry, to notice that it changed. */
  currentAmountCents?: number;
  /** The amount currently in the form, or null while it cannot be parsed. */
  amountCents?: number | null;
}) {
  const t = useMessages();
  const fromId = useId();
  const untilId = useId();
  const copy = t.validity;

  const editing = currentFrom !== undefined;
  const amountChanged =
    editing &&
    currentAmountCents !== undefined &&
    amountCents != null &&
    amountCents !== currentAmountCents;

  // The earliest month a change can start without overwriting the entry's own first
  // month — below that it is a correction, not a change.
  const earliestChange = editing ? nextPeriod(currentFrom) : defaultFrom;
  const today = periodFromDate(new Date());
  const [changeFrom, setChangeFrom] = useState(
    today > earliestChange ? today : earliestChange,
  );
  const [mode, setMode] = useState<"change" | "correct">("change");
  const [from, setFrom] = useState(defaultFrom);
  const [until, setUntil] = useState(defaultUntil ?? "");

  if (amountChanged) {
    const effectiveFrom = mode === "change" ? changeFrom : currentFrom;
    return (
      <fieldset className="border-line rounded-control border p-3">
        <legend className="px-1 text-sm font-medium">{copy.changeTitle}</legend>

        {/* The chosen month is what the server reads; the mode only decides which. */}
        <input type="hidden" name="validFrom" value={effectiveFrom} />
        <input type="hidden" name="validUntil" value={until} />

        <div className="border-line bg-surface-muted mb-3 grid grid-cols-2 gap-1 rounded-full border p-1">
          {(
            [
              ["change", copy.modeChange],
              ["correct", copy.modeCorrect],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded-full px-3 py-2.5 text-sm font-medium transition-colors sm:py-1.5",
                mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "change" ? (
          <Field label={copy.modeChange} htmlFor={fromId} hint={copy.modeChangeHint}>
            <Input
              id={fromId}
              type="month"
              min={earliestChange}
              value={changeFrom}
              onChange={(event) => setChangeFrom(event.target.value || earliestChange)}
              required
            />
          </Field>
        ) : (
          <p className="text-ink-muted text-sm">{copy.modeCorrectHint}</p>
        )}

        <Preview
          mode={mode}
          changeFrom={changeFrom}
          currentFrom={currentFrom}
          oldCents={currentAmountCents}
          newCents={amountCents}
        />
      </fieldset>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label={copy.from}
        htmlFor={fromId}
        hint={editing ? undefined : copy.fromHint}
      >
        <Input
          id={fromId}
          name="validFrom"
          type="month"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          required
        />
      </Field>

      <Field label={copy.until} htmlFor={untilId} hint={copy.untilHint}>
        <Input
          id={untilId}
          name="validUntil"
          type="month"
          min={from}
          value={until}
          onChange={(event) => setUntil(event.target.value)}
        />
      </Field>
    </div>
  );
}

/** The rows that will exist after saving, in the order they will be read. */
function Preview({
  mode,
  changeFrom,
  currentFrom,
  oldCents,
  newCents,
}: {
  mode: "change" | "correct";
  changeFrom: string;
  currentFrom: string;
  oldCents: number;
  newCents: number;
}) {
  const t = useMessages();
  const copy = t.validity;

  // A half-typed month must never reach the period arithmetic.
  if (!isPeriod(changeFrom)) {
    return null;
  }

  const rows =
    mode === "change"
      ? [
          {
            when: copy.previewUntil(formatPeriod(previousPeriod(changeFrom))),
            cents: oldCents,
            note: copy.previewOld,
          },
          {
            when: copy.previewFrom(formatPeriod(changeFrom)),
            cents: newCents,
            note: copy.previewNew,
          },
        ]
      : [
          {
            when: copy.previewFrom(formatPeriod(currentFrom)),
            cents: newCents,
            note: copy.previewNew,
          },
        ];

  return (
    <div className="border-line mt-3 space-y-1.5 border-t pt-3">
      <p className="text-ink-muted text-xs font-medium">{copy.previewTitle}</p>
      {rows.map((row) => (
        <div key={row.when} className="flex items-center gap-2 text-sm">
          <span className="min-w-0 truncate">{row.when}</span>
          <span className="text-ink-muted text-xs">{row.note}</span>
          <span className="font-ledger tabular ml-auto">{formatCents(row.cents)}</span>
        </div>
      ))}
    </div>
  );
}
