"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ValidityNote } from "@/components/patterns/validity-note";
import { periodFromDate } from "@/lib/domain/period";
import { formatCents, formatInterval } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import type { MemberWithIncome } from "@/server/services/members";
import {
  removeIncomeAction,
  restoreIncomeAction,
  restoreMemberAction,
  retireMemberAction,
} from "./actions";
import { IncomeDialog } from "./income-dialog";
import { MemberDialog } from "./member-dialog";

export function MemberCard({ member }: { member: MemberWithIncome }) {
  const [, startTransition] = useTransition();
  const copy = de.sections.household;
  const currentPeriod = periodFromDate(new Date());

  /**
   * Removal happens immediately and offers an undo, rather than asking "are you sure?"
   * first. The undo is the confirmation, and it costs nothing when the tap was intended.
   */
  function retire() {
    startTransition(async () => {
      await retireMemberAction(member.id);
      toast(copy.memberRemoved(member.name), {
        action: {
          label: de.actions.undo,
          onClick: () => startTransition(() => void restoreMemberAction(member.id)),
        },
      });
    });
  }

  function dropIncome(id: number) {
    startTransition(async () => {
      await removeIncomeAction(id);
      toast(copy.incomeRemoved, {
        action: {
          label: de.actions.undo,
          onClick: () => startTransition(() => void restoreIncomeAction(id)),
        },
      });
    });
  }

  return (
    <Card className="p-0">
      <header className="flex items-center gap-3 px-5 py-4">
        <span
          aria-hidden
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: `var(--color-member-${member.colorIndex})` }}
        />
        <h2 className="font-display truncate text-lg font-semibold tracking-tight">
          {member.name}
        </h2>

        <span className="font-ledger tabular ml-auto text-base font-medium">
          {formatCents(member.monthlyIncomeCents)}
        </span>

        <div className="flex shrink-0 items-center">
          <MemberDialog
            member={member}
            trigger={
              <Button variant="ghost" size="icon" aria-label={copy.editMember}>
                <Pencil className="size-4" aria-hidden />
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={copy.removeMember}
            onClick={retire}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <div className="border-line border-t">
        {member.incomes.length === 0 ? (
          <p className="text-ink-muted px-5 py-4 text-sm">{copy.noIncome}</p>
        ) : (
          <ul>
            {member.incomes.map((entry) => (
              <li
                key={entry.id}
                className="border-line flex items-center gap-3 border-b px-5 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{entry.label}</p>
                  <p className="text-ink-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    {entry.intervalMonths !== 1 ? (
                      <span>
                        {formatCents(entry.amountCents)} ·{" "}
                        {formatInterval(entry.intervalMonths)}
                      </span>
                    ) : null}
                    <ValidityNote
                      validFrom={entry.validFrom}
                      validUntil={entry.validUntil}
                      currentPeriod={currentPeriod}
                    />
                  </p>
                </div>

                <span className="font-ledger tabular ml-auto text-sm">
                  {formatCents(entry.monthlyCents)}
                </span>

                <div className="flex shrink-0 items-center">
                  <IncomeDialog
                    memberId={member.id}
                    income={entry}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={copy.editIncome}>
                        <Pencil className="size-3.5" aria-hidden />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={copy.removeIncome}
                    onClick={() => dropIncome(entry.id)}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="border-line border-t px-3 py-2">
          <IncomeDialog
            memberId={member.id}
            trigger={
              <Button variant="ghost" size="sm">
                <Plus className="size-4" aria-hidden />
                {copy.addIncome}
              </Button>
            }
          />
        </div>
      </div>
    </Card>
  );
}
