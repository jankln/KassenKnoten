"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_COLOR_INDEX } from "@/lib/validation/member";
import { addMember, editMember } from "./actions";
import { useMessages } from "@/components/providers/messages-provider";

const MEMBER_COLORS = [
  "member-1",
  "member-2",
  "member-3",
  "member-4",
  "member-5",
] as const;

export function MemberDialog({
  trigger,
  member,
  defaultColorIndex,
}: {
  trigger: ReactNode;
  /** Absent when adding someone new. */
  member?: { id: number; name: string; colorIndex: number };
  defaultColorIndex?: number;
}) {
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [colorIndex, setColorIndex] = useState(
    member?.colorIndex ?? defaultColorIndex ?? 1,
  );

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = member
        ? await editMember(member.id, formData)
        : await addMember(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setError(undefined);
        setOpen(false);
      }
    });
  }

  const copy = t.sections.household;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={member ? copy.editMember : copy.newMember}>
        <form action={submit} className="space-y-5">
          <Field label={copy.memberName} htmlFor="member-name" error={error}>
            <Input
              id="member-name"
              name="name"
              defaultValue={member?.name}
              placeholder={copy.memberNamePlaceholder}
              maxLength={40}
              autoComplete="off"
              required
              autoFocus
            />
          </Field>

          <fieldset>
            <legend className="mb-2 block text-sm font-medium">{copy.color}</legend>
            <div className="flex gap-2.5">
              {MEMBER_COLORS.slice(0, MAX_COLOR_INDEX).map((token, index) => {
                const value = index + 1;
                const active = colorIndex === value;
                return (
                  <label
                    key={token}
                    className={cn(
                      "size-9 cursor-pointer rounded-full ring-offset-2 transition-[box-shadow]",
                      "ring-offset-surface has-focus-visible:ring-brass has-focus-visible:ring-2",
                      active && "ring-ink ring-2",
                    )}
                    style={{ backgroundColor: `var(--color-${token})` }}
                  >
                    <input
                      type="radio"
                      name="colorIndex"
                      value={value}
                      checked={active}
                      onChange={() => setColorIndex(value)}
                      className="sr-only"
                    />
                    <span className="sr-only">{`${copy.color} ${value}`}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-ink-muted mt-2 text-sm">{copy.colorHint}</p>
          </fieldset>

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
