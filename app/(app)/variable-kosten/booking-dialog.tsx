"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { MoneyInput } from "@/components/ui/money-input";
import type { BookingRow } from "@/server/services/variable-costs";
import { addBooking, editBooking } from "./actions";
import { useMessages } from "@/components/providers/messages-provider";

/**
 * One receipt: a date, an amount, and optionally what it was for.
 *
 * `type="date"` because this is the one place in the app that deals in days, and it is
 * the control that brings the right keyboard and the right picker on a phone. The date
 * defaults to the month being viewed rather than to today, so entering last month's
 * receipts does not mean correcting the date on every single one.
 */
export function BookingDialog({
  trigger,
  variableCostId,
  defaultDate,
  booking,
}: {
  trigger: ReactNode;
  variableCostId: number;
  /** `YYYY-MM-DD`, sensible for the month on screen. */
  defaultDate: string;
  /** Absent when adding a new receipt. */
  booking?: BookingRow;
}) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const copy = t.sections.variableCosts;

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = booking
        ? await editBooking(booking.id, formData)
        : await addBooking(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={booking ? copy.editBooking : copy.newBooking}>
        <form action={submit} className="space-y-4">
          <input type="hidden" name="variableCostId" value={variableCostId} />

          <Field label={copy.bookingAmount} htmlFor="booking-amount" error={error}>
            <MoneyInput
              id="booking-amount"
              name="amountCents"
              defaultCents={booking?.amountCents}
              required
            />
          </Field>

          <Field label={copy.bookingDate} htmlFor="booking-date">
            <Input
              id="booking-date"
              name="bookedOn"
              type="date"
              defaultValue={booking?.bookedOn ?? defaultDate}
              required
            />
          </Field>

          <Field label={copy.bookingLabel} htmlFor="booking-label">
            <Input
              id="booking-label"
              name="label"
              defaultValue={booking?.label ?? ""}
              placeholder={copy.bookingLabelPlaceholder}
              maxLength={60}
              autoComplete="off"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t.actions.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" variant="primary" disabled={pending}>
              {t.actions.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
