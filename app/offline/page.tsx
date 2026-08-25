import type { Metadata } from "next";
import { KnotMark } from "@/components/brand/knot-mark";
import { buttonStyles } from "@/components/ui/button";
import { getMessages } from "@/server/i18n";

// A page title is copy like any other, so it is resolved per request rather than
// frozen into a module constant at import time.
export function generateMetadata(): Metadata {
  const t = getMessages();
  return { title: t.offline.title };
}

/**
 * What the installed app shows when it cannot reach the server.
 *
 * Precached by the service worker, so it must stay free of household data and free of
 * anything that needs the network — including a server action. The retry is a plain link
 * back to the dashboard: if the connection is back it loads, and if it is not the worker
 * lands here again, which is the honest answer.
 */
export default function OfflinePage() {
  const t = getMessages();
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="ruled pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative w-full max-w-sm text-center">
        <KnotMark className="mx-auto mb-8 h-14 w-14 opacity-60" />

        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">
          {t.offline.title}
        </h1>
        <p className="text-ink-muted mt-3 text-sm leading-relaxed text-balance">
          {t.offline.body}
        </p>

        {/* A hard navigation on purpose. `next/link` would ask the router for an RSC
            payload, which is exactly what cannot be fetched here; a document load either
            reaches the server or lands back on this page, which is the honest answer. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className={buttonStyles({
            variant: "primary",
            size: "md",
            className: "mt-8",
          })}
        >
          {t.offline.retry}
        </a>
      </div>
    </main>
  );
}
