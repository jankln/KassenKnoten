"use client";

import { useId, useState } from "react";
import { formatCents, parseAmountToCents } from "@/lib/format";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { Input } from "./field";

/**
 * An amount field that speaks German: "1.234,56" and "1234,56" and "1234.56" all mean the
 * same thing. It echoes back what it understood, so a mistyped separator is caught while
 * typing rather than after saving.
 *
 * The visible field carries the text; a hidden field carries the parsed cents, so the
 * server action never has to re-implement the parsing.
 */
export function MoneyInput({
  name,
  id,
  defaultCents,
  required,
  onTextChange,
}: {
  name: string;
  id: string;
  defaultCents?: number;
  required?: boolean;
  /** Lets a form react to the amount as it is typed, e.g. for a live split preview. */
  onTextChange?: (value: string) => void;
}) {
  const [text, setText] = useState(
    defaultCents === undefined ? "" : (defaultCents / 100).toFixed(2).replace(".", ","),
  );
  const hiddenId = useId();
  const cents = parseAmountToCents(text);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={text}
          required={required}
          onChange={(event) => {
            setText(event.target.value);
            onTextChange?.(event.target.value);
          }}
          className="tabular font-ledger pr-9"
          aria-describedby={hiddenId}
        />
        <span
          aria-hidden
          className="text-ink-muted pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
        >
          €
        </span>
      </div>
      <input type="hidden" name={name} value={cents ?? ""} />
      <p id={hiddenId} className="text-ink-muted text-sm tabular-nums">
        {text.trim() === ""
          ? " "
          : cents === null
            ? "Kein gültiger Betrag"
            : formatCents(cents)}
      </p>
    </div>
  );
}
