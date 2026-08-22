"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import { ValidityFields } from "@/components/patterns/validity-fields";
import { periodFromDate } from "@/lib/domain/period";
import { parseAmountToCents } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import { formatInterval } from "@/lib/format";
import { addIncome, editIncome } from "./actions";

/** The rhythms an income actually comes in. */
const INTERVALS = [1, 3, 6, 12] as const;

export function IncomeDialog({
  trigger,
  memberId,
  income,
}: {
  trigger: ReactNode;
  memberId: number;
  /** Absent when adding a new source. */
  income?: {
    id: number;
    label: string;
    kind: "salary" | "other";
    amountCents: number;
    intervalMonths: number;
    validFrom: string;
    validUntil: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [amountText, setAmountText] = useState(
    income === undefined ? "" : (income.amountCents / 100).toFixed(2).replace(".", ","),
  );
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = income
        ? await editIncome(income.id, memberId, formData)
        : await addIncome(memberId, formData);

      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  const copy = de.sections.household;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={income ? copy.editIncome : copy.newIncome}>
        <form action={submit} className="space-y-4">
          <Field label={copy.incomeLabel} htmlFor="income-label" error={error}>
            <Input
              id="income-label"
              name="label"
              defaultValue={income?.label}
              placeholder={copy.incomeLabelPlaceholder}
              maxLength={60}
              autoComplete="off"
              required
              autoFocus
            />
          </Field>

          <Field label={copy.amount} htmlFor="income-amount">
            <MoneyInput
              id="income-amount"
              name="amountCents"
              onTextChange={setAmountText}
              defaultCents={income?.amountCents}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={copy.interval} htmlFor="income-interval">
              <Select
                id="income-interval"
                name="intervalMonths"
                defaultValue={income?.intervalMonths ?? 1}
              >
                {INTERVALS.map((months) => (
                  <option key={months} value={months}>
                    {formatInterval(months)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label={copy.incomeKind} htmlFor="income-kind">
              <Select
                id="income-kind"
                name="kind"
                defaultValue={income?.kind ?? "salary"}
              >
                <option value="salary">{copy.incomeKindSalary}</option>
                <option value="other">{copy.incomeKindOther}</option>
              </Select>
            </Field>
          </div>

          <ValidityFields
            defaultFrom={income?.validFrom ?? periodFromDate(new Date())}

            defaultUntil={income?.validUntil}

            currentFrom={income?.validFrom}
            currentAmountCents={income?.amountCents}
            amountCents={parseAmountToCents(amountText)}
          />

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {de.actions.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {de.actions.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
