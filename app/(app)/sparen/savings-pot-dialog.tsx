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
import { de } from "@/lib/i18n/de";
import type { SavingsPotRow } from "@/server/services/savings";
import { addSavingsPot, editSavingsPot } from "./actions";

export function SavingsPotDialog({
  trigger,
  members,
  pot,
}: {
  trigger: ReactNode;
  members: { id: number; name: string }[];
  pot?: SavingsPotRow;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const copy = de.sections.savings;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = pot
        ? await editSavingsPot(pot.id, formData)
        : await addSavingsPot(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setError(undefined);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={pot ? copy.editPot : copy.newPot}>
        <form action={submit} className="space-y-4">
          <Field label={copy.potName} htmlFor="savings-name" error={error}>
            <Input
              id="savings-name"
              name="name"
              defaultValue={pot?.name}
              placeholder={copy.potNamePlaceholder}
              maxLength={60}
              autoComplete="off"
              required
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.monthlyRate} htmlFor="savings-rate">
              <MoneyInput
                id="savings-rate"
                name="monthlyRateCents"
                defaultCents={pot?.monthlyRateCents}
                required
              />
            </Field>
            <Field label={copy.balance} htmlFor="savings-balance">
              <MoneyInput
                id="savings-balance"
                name="balanceCents"
                defaultCents={pot?.balanceCents}
                required
              />
            </Field>
          </div>

          <Field label={copy.target} htmlFor="savings-target">
            <MoneyInput
              id="savings-target"
              name="targetCents"
              defaultCents={pot?.targetCents ?? undefined}
            />
          </Field>

          <Field label={copy.owner} htmlFor="savings-owner">
            <Select
              id="savings-owner"
              name="ownerMemberId"
              defaultValue={pot?.ownerMemberId ?? ""}
            >
              <option value="">{copy.household}</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={copy.note} htmlFor="savings-note">
            <Input
              id="savings-note"
              name="note"
              defaultValue={pot?.note ?? ""}
              placeholder={copy.notePlaceholder}
              maxLength={240}
              autoComplete="off"
            />
          </Field>

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
