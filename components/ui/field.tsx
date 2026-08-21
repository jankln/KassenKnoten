import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled form row with room for a hint and an error, always in that order. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-negative text-sm">
          {error}
        </p>
      ) : hint ? (
        <p className="text-ink-muted text-sm">{hint}</p>
      ) : null}
    </div>
  );
}

const control =
  "border-line bg-canvas rounded-control h-11 w-full border px-3 text-base transition-colors outline-none focus-visible:border-brass disabled:opacity-60";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "pr-8", className)} {...props} />;
}
