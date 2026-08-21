"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCents, formatShareBp } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import type { SavingsPotRow } from "@/server/services/savings";
import { removeSavingsPot, restoreSavingsPotAction } from "./actions";
import { SavingsPotDialog } from "./savings-pot-dialog";

export function SavingsList({
  pots,
  members,
}: {
  pots: SavingsPotRow[];
  members: { id: number; name: string }[];
}) {
  const [, startTransition] = useTransition();
  const copy = de.sections.savings;
  const totalRate = pots.reduce((sum, pot) => sum + pot.monthlyRateCents, 0);
  const totalBalance = pots.reduce((sum, pot) => sum + pot.balanceCents, 0);

  function retire(id: number) {
    startTransition(async () => {
      await removeSavingsPot(id);
      toast(copy.potRemoved, {
        action: {
          label: de.actions.undo,
          onClick: () => startTransition(() => void restoreSavingsPotAction(id)),
        },
      });
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Summary label={copy.totalRate} cents={totalRate} />
        <Summary label={copy.totalBalance} cents={totalBalance} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {pots.map((pot) => (
          <Card key={pot.id} className="flex min-w-0 flex-col gap-5">
            <header className="flex items-start gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold tracking-tight break-words">
                  {pot.name}
                </h2>
                <p className="text-ink-muted mt-1 text-sm">
                  {pot.ownerName ? (
                    <span className="inline-flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            pot.ownerColorIndex === null
                              ? undefined
                              : `var(--color-member-${pot.ownerColorIndex})`,
                        }}
                      />
                      {pot.ownerName}
                    </span>
                  ) : (
                    copy.household
                  )}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 items-center">
                <SavingsPotDialog
                  members={members}
                  pot={pot}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={copy.editPot}>
                      <Pencil className="size-4" aria-hidden />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={copy.removePot}
                  onClick={() => retire(pot.id)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </header>

            <div className="grid grid-cols-2 gap-4">
              <Metric label={copy.balance} cents={pot.balanceCents} />
              <Metric label={copy.monthlyRate} cents={pot.monthlyRateCents} />
            </div>

            {pot.targetCents !== null ? (
              <div>
                <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-ink-muted">{copy.progress}</span>
                  <span className="font-ledger tabular font-medium">
                    {formatShareBp(pot.progressBp ?? 0)}
                  </span>
                </div>
                <div
                  className="bg-surface-muted h-2 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round((pot.progressBp ?? 0) / 100)}
                  aria-label={copy.progress}
                >
                  <div
                    className="bar-grow bg-brass h-full rounded-full"
                    style={{ width: `${(pot.progressBp ?? 0) / 100}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
                  <span className="text-ink-muted">
                    {copy.targetOf} {formatCents(pot.targetCents)}
                  </span>
                  {pot.overTarget ? (
                    <span className="text-positive font-medium">{copy.overTarget}</span>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-ink-muted text-sm">{copy.noTarget}</p>
            )}

            {pot.note ? (
              <p className="text-ink-muted border-line border-t pt-3 text-sm break-words">
                {pot.note}
              </p>
            ) : null}
          </Card>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <SavingsPotDialog
          members={members}
          trigger={
            <Button variant="secondary">
              <Plus className="size-4" aria-hidden />
              {copy.addPot}
            </Button>
          }
        />
      </div>
    </div>
  );
}

function Summary({ label, cents }: { label: string; cents: number }) {
  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <span className="text-ink-muted text-sm">{label}</span>
      <span className="font-ledger tabular text-lg font-semibold">
        {formatCents(cents)}
      </span>
    </Card>
  );
}

function Metric({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="min-w-0">
      <p className="text-ink-muted text-xs">{label}</p>
      <p className="font-ledger tabular mt-1 text-base font-medium">
        {formatCents(cents)}
      </p>
    </div>
  );
}
