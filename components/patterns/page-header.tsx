import type { ReactNode } from "react";

/**
 * The top of every section. Title and one sentence saying what the section is for —
 * the same shape everywhere, so moving between sections never costs a re-orientation.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-7 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-ink-muted mt-1.5 text-sm text-balance">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
