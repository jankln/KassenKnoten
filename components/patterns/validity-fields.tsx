"use client";

import { useId, useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { de } from "@/lib/i18n/de";

/**
 * The months an entry applies to.
 *
 * `type="month"` is the one native control that hands back a `YYYY-MM` string directly,
 * brings its own keyboard on a phone, and needs no library.
 *
 * The hint below "Gültig ab" is the whole model in one sentence: moving the date forward
 * on an existing entry keeps the earlier months as they were. It only appears while
 * editing, because on a new entry there is nothing to leave alone.
 */
export function ValidityFields({
  defaultFrom,
  defaultUntil,
  /** The month an existing entry currently starts at, if this is an edit. */
  currentFrom,
}: {
  defaultFrom: string;
  defaultUntil?: string | null;
  currentFrom?: string;
}) {
  const fromId = useId();
  const untilId = useId();
  const [from, setFrom] = useState(defaultFrom);

  const copy = de.validity;
  const willSplit = currentFrom !== undefined && from > currentFrom;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label={copy.from}
        htmlFor={fromId}
        hint={willSplit ? copy.splitHint : undefined}
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
          defaultValue={defaultUntil ?? ""}
        />
      </Field>
    </div>
  );
}
