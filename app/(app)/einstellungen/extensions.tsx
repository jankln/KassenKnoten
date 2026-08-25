"use client";

import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useMessages } from "@/components/providers/messages-provider";
import { cn } from "@/lib/utils";
import type { InstalledExtension } from "@/server/extensions/types";
import {
  installExtension,
  removeExtension,
  toggleExtension,
} from "./extension-actions";

/**
 * Installing and managing extensions.
 *
 * The warning is not a footnote. An extension here runs on the server with full access to
 * the household's finances, and the one honest thing a screen can do about that is say so
 * before the file picker rather than after.
 */
export function Extensions({
  installed,
  enabled,
}: {
  installed: InstalledExtension[];
  /** False when EXTENSIONS_ENABLED=false on this instance. */
  enabled: boolean;
}) {
  const t = useMessages();
  const copy = t.extensions;
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!enabled) {
    return <p className="text-ink-muted text-sm">{copy.switchedOff}</p>;
  }

  function submit() {
    setError(undefined);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError(copy.missingFile);
      return;
    }
    if (!confirmed) {
      setError(copy.notConfirmed);
      return;
    }
    const form = new FormData();
    form.set("file", file);
    form.set("confirmed", "true");
    startTransition(async () => {
      const result = await installExtension(form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirmed(false);
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function drop(id: string) {
    startTransition(async () => {
      await removeExtension(id);
      toast(copy.removed);
    });
  }

  return (
    <div className="space-y-5">
      <div className="border-warning/35 bg-warning/10 text-ink-muted rounded-control flex items-start gap-3 border px-4 py-3 text-sm">
        <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden />
        <span>{copy.warning}</span>
      </div>

      {installed.length === 0 ? (
        <p className="text-ink-muted text-sm">{copy.none}</p>
      ) : (
        <ul className="border-line divide-line rounded-card divide-y border">
          {installed.map((extension) => (
            <li key={extension.manifest.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="font-medium break-words">{extension.manifest.name}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      extension.error
                        ? "bg-negative/15 text-negative"
                        : extension.enabled
                          ? "bg-brass/15 text-brass-ink"
                          : "bg-surface-muted text-ink-muted",
                    )}
                  >
                    {extension.error
                      ? "!"
                      : extension.enabled
                        ? copy.enabled
                        : copy.disabled}
                  </span>
                </div>
                <p className="text-ink-muted mt-0.5 text-xs">
                  {copy.installed(extension.manifest.version)}
                  {extension.manifest.author
                    ? ` · ${copy.by(extension.manifest.author)}`
                    : ""}
                </p>
                {extension.manifest.description ? (
                  <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
                    {extension.manifest.description}
                  </p>
                ) : null}
                {extension.error ? (
                  <p className="text-negative mt-1.5 text-xs" role="alert">
                    {copy.broken} {extension.error}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending || Boolean(extension.error)}
                  onClick={() =>
                    startTransition(
                      () =>
                        void toggleExtension(extension.manifest.id, !extension.enabled),
                    )
                  }
                >
                  {extension.enabled ? copy.disable : copy.enable}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={copy.remove}
                  onClick={() => drop(extension.manifest.id)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-line border-t pt-5">
        <label htmlFor="extension-file" className="block text-sm font-medium">
          {copy.uploadFile}
        </label>
        <Input
          ref={fileRef}
          id="extension-file"
          type="file"
          accept=".mjs,text/javascript"
          onChange={() => setError(undefined)}
          className="mt-1.5 h-auto py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:font-medium"
        />
        <p className="text-ink-muted mt-1.5 text-sm">{copy.uploadHint}</p>

        <label className="mt-4 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => {
              setConfirmed(event.target.checked);
              setError(undefined);
            }}
            className="mt-0.5 size-4 accent-[var(--color-brass)]"
          />
          <span>{copy.uploadConfirm}</span>
        </label>

        {error ? (
          <p className="text-negative mt-3 text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className={cn(buttonStyles({ variant: "primary", size: "md" }), "mt-4")}
          disabled={pending}
          onClick={submit}
        >
          <Plus className="size-4" aria-hidden />
          {copy.upload}
        </button>
      </div>
    </div>
  );
}
