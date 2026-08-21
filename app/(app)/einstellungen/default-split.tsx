"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FULL_SHARE_BP } from "@/lib/domain/money";
import type { SplitMode } from "@/lib/domain/split";
import { formatShareBp } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { saveDefaultSplit } from "./actions";

export interface SplitDefaultsMember {
  id: number;
  name: string;
  colorIndex: number;
}

/**
 * The household's default split. It pre-fills the form for a new shared cost and nothing
 * else — every existing expense keeps the split it was given.
 */
export function DefaultSplitForm({
  members,
  defaultMode,
  defaultShares,
}: {
  members: SplitDefaultsMember[];
  defaultMode: SplitMode;
  defaultShares: readonly { memberId: number; shareBp: number }[];
}) {
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
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const copy = de.sections.fixedCosts;
  const totalBp = members.reduce(
    (total, member) => total + (shares[member.id] ?? 0),
    0,
  );
  const valid = mode === "income_ratio" || totalBp === FULL_SHARE_BP;

  function submit(formData: FormData) {
    startTransition(async () => {
      await saveDefaultSplit(formData);
      setSaved(true);
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="splitMode" value={mode} />

      <div className="border-line bg-surface-muted grid max-w-xs grid-cols-2 gap-1 rounded-full border p-1">
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
            onClick={() => {
              setMode(value);
              setSaved(false);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              mode === value ? "bg-surface text-ink shadow-sm" : "text-ink-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "fixed_quota" ? (
        <div className="max-w-xs space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: `var(--color-member-${member.colorIndex})` }}
              />
              <label
                htmlFor={`default-share-${member.id}`}
                className="min-w-0 flex-1 truncate text-sm"
              >
                {member.name}
              </label>
              <input
                id={`default-share-${member.id}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step="0.01"
                value={Math.round(shares[member.id] ?? 0) / 100}
                onChange={(event) => {
                  setSaved(false);
                  setShares((current) => ({
                    ...current,
                    [member.id]: Math.round(Number(event.target.value) * 100),
                  }));
                }}
                className="border-line bg-canvas rounded-control font-ledger tabular focus-visible:border-brass h-10 w-20 border px-2 text-right text-sm outline-none"
              />
              <span className="text-ink-muted text-sm">%</span>
              <input
                type="hidden"
                name={`share-${member.id}`}
                value={shares[member.id] ?? 0}
              />
            </div>
          ))}

          {!valid ? (
            <p role="alert" className="text-negative text-sm">
              {de.validation.sharesMustSum} ({formatShareBp(totalBp)})
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-ink-muted text-sm">{copy.splitIncomeHint}</p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={pending || !valid}
        >
          {de.actions.save}
        </Button>
        {saved ? (
          <span className="text-positive text-sm">{de.actions.saved}</span>
        ) : null}
      </div>
    </form>
  );
}
