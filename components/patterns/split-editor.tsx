"use client";

import { useEffect, useState } from "react";
import { FULL_SHARE_BP } from "@/lib/domain/money";
import { splitExpense, type SplitMode } from "@/lib/domain/split";
import { formatCents, formatShareBp } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMessages } from "@/components/providers/messages-provider";

export interface SplitMember {
  id: number;
  name: string;
  colorIndex: number;
  monthlyIncomeCents: number;
}

/**
 * How one shared cost is divided.
 *
 * The mode is always an explicit choice: the household default arrives as a pre-filled
 * value, never as a silent fallback. The euro preview is computed with `splitExpense`
 * from `lib/domain` — the same pure function the server uses — because a preview
 * calculated a second way is a preview that can disagree with the result.
 */
export function SplitEditor({
  members,
  amountCents,
  defaultMode,
  defaultShares,
  error,
}: {
  members: SplitMember[];
  /** The monthly amount being split, for the live preview. */
  amountCents: number;
  defaultMode: SplitMode;
  defaultShares: readonly { memberId: number; shareBp: number }[];
  error?: string;
}) {
  const t = useMessages();
  const [mode, setMode] = useState<SplitMode>(defaultMode);
  const [shares, setShares] = useState<Record<number, number>>(() =>
    Object.fromEntries(
      members.map((member) => [
        member.id,
        defaultShares.find((share) => share.memberId === member.id)?.shareBp ??
          Math.round(FULL_SHARE_BP / Math.max(members.length, 1)),
      ]),
    ),
  );

  const copy = t.sections.fixedCosts;
  const totalBp = members.reduce(
    (total, member) => total + (shares[member.id] ?? 0),
    0,
  );

  const preview = splitExpense(
    {
      amountCents,
      intervalMonths: 1,
      splitMode: mode,
      shares: members.map((member) => ({
        memberId: member.id,
        shareBp: shares[member.id] ?? 0,
      })),
    },
    {
      members,
      defaultShares,
      monthlyIncomeByMember: new Map(
        members.map((member) => [member.id, member.monthlyIncomeCents]),
      ),
    },
  );

  const noIncome = members.every((member) => member.monthlyIncomeCents === 0);
  const colorIndexOf = new Map(members.map((member) => [member.id, member.colorIndex]));

  // The preview recomputes on every keystroke. Reading it out that often is worse than
  // not reading it at all, so the spoken copy lags behind the visible one and only
  // catches up once the user stops typing.
  const spoken = preview.perMember
    .map((share) => `${share.name} ${formatCents(share.cents)}`)
    .join(", ");
  const announced = useSettledValue(spoken, 700);

  return (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium">{copy.split}</legend>
      <input type="hidden" name="splitMode" value={mode} />

      <div className="border-line bg-surface-muted mb-3 grid grid-cols-2 gap-1 rounded-full border p-1">
        {(
          [
            ["fixed_quota", copy.splitFixed],
            ["income_ratio", copy.splitIncome],
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

      {mode === "fixed_quota" ? (
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--color-member-${member.colorIndex})` }}
              />
              <label
                htmlFor={`share-${member.id}`}
                className="min-w-0 flex-1 truncate text-sm"
              >
                {member.name}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id={`share-${member.id}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  step="0.01"
                  value={round2(shares[member.id] ?? 0)}
                  onChange={(event) =>
                    setShares((current) => ({
                      ...current,
                      [member.id]: Math.round(Number(event.target.value) * 100),
                    }))
                  }
                  className="border-line bg-canvas rounded-control font-ledger tabular focus-visible:border-brass h-10 w-20 border px-2 text-right text-sm outline-none"
                />
                <span className="text-ink-muted text-sm">%</span>
              </div>
              <input
                type="hidden"
                name={`share-${member.id}`}
                value={shares[member.id] ?? 0}
              />
            </div>
          ))}

          {totalBp !== FULL_SHARE_BP ? (
            <p role="alert" className="text-negative pt-1 text-sm">
              {t.validation.sharesMustSum} ({formatShareBp(totalBp)})
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-ink-muted text-sm">
          {noIncome ? copy.splitNoIncomeHint : copy.splitIncomeHint}
        </p>
      )}

      {/* What this actually costs each person, updated as the form changes. */}
      <div className="border-line mt-4 space-y-1.5 border-t pt-3">
        <p className="text-ink-muted text-xs font-medium">{copy.splitPreview}</p>
        <p aria-live="polite" className="sr-only">
          {`${copy.splitPreview}: ${announced}`}
        </p>

        {/* The strands from the Knoten mark, laid flat: one segment per person, its
            width carrying that person's share. It re-proportions as the amount, the mode
            or a quota is typed — the one piece of motion in this form, and it is showing
            state that actually changed. The numbers below are the accessible reading;
            this is the shape of them. */}
        <div
          aria-hidden
          className="bg-surface-muted mt-2 mb-2.5 flex h-2 overflow-hidden rounded-full"
        >
          {preview.perMember.map((share) => (
            <span
              key={share.memberId}
              className="bar-move h-full"
              style={{
                width: `${share.shareBp / 100}%`,
                backgroundColor: `var(--color-member-${colorIndexOf.get(share.memberId) ?? 1})`,
              }}
            />
          ))}
        </div>
        {preview.perMember.map((share) => (
          <div key={share.memberId} className="flex items-center gap-2 text-sm">
            <span className="truncate">{share.name}</span>
            <span className="text-ink-muted">{formatShareBp(share.shareBp)}</span>
            <span className="font-ledger tabular ml-auto">
              {formatCents(share.cents)}
            </span>
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-negative mt-2 text-sm">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function round2(shareBp: number): number {
  return Math.round(shareBp) / 100;
}

/** The given value, but only after it has stopped changing for `delay` milliseconds. */
function useSettledValue<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
