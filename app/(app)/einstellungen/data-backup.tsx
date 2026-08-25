"use client";

import { useRef, useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useMessages } from "@/components/providers/messages-provider";

export function DataBackup() {
  const t = useMessages();
  const copy = t.sections.settings;
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    setSuccess(false);
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError(copy.restoreMissingFile);
      return;
    }
    if (!confirmed) {
      setError(copy.restoreNotConfirmed);
      return;
    }

    const form = new FormData();
    form.set("file", file);
    form.set("confirmed", "true");
    startTransition(async () => {
      try {
        const response = await fetch("/api/backup/restore", {
          method: "POST",
          body: form,
        });
        const result = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(result.error ?? copy.restoreFailed);
          return;
        }
        setSuccess(true);
        window.location.reload();
      } catch {
        setError(copy.restoreFailed);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          className={buttonStyles({ variant: "secondary", size: "md" })}
          href="/api/backup/export?format=json"
          download
        >
          {copy.downloadJson}
        </a>
        <a
          className={buttonStyles({ variant: "secondary", size: "md" })}
          href="/api/backup/export?format=csv"
          download
        >
          {copy.downloadCsv}
        </a>
      </div>

      <div className="border-line border-t pt-5">
        <h3 className="font-semibold">{copy.restoreTitle}</h3>
        <p className="text-ink-muted mt-1 text-sm">{copy.restoreHint}</p>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="backup-file" className="block text-sm font-medium">
              {copy.restoreFile}
            </label>
            <Input
              ref={inputRef}
              id="backup-file"
              type="file"
              accept="application/json,.json"
              onChange={() => {
                setError(undefined);
                setSuccess(false);
              }}
              className="h-auto py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:font-medium"
            />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => {
                setConfirmed(event.target.checked);
                setError(undefined);
              }}
              className="mt-0.5 size-4 accent-[var(--color-brass)]"
            />
            <span>{copy.restoreConfirm}</span>
          </label>
          {error ? (
            <p className="text-negative text-sm" role="alert">
              {error}
            </p>
          ) : success ? (
            <p className="text-positive text-sm" role="status">
              {copy.restoreSucceeded}
            </p>
          ) : null}
          <button
            type="button"
            className={buttonStyles({ variant: "danger", size: "md" })}
            disabled={pending}
            onClick={submit}
          >
            {copy.restore}
          </button>
        </div>
      </div>
    </div>
  );
}
