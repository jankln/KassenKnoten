"use client";

import { useState, useSyncExternalStore } from "react";
import { buttonStyles } from "@/components/ui/button";
import { installAdvice, type InstallAdvice } from "@/lib/pwa/install-target";
import { useMessages } from "@/components/providers/messages-provider";
import type { Messages } from "@/lib/i18n";

/**
 * The `beforeinstallprompt` event. Chromium-only, so it is not in the DOM lib.
 */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = { advice: InstallAdvice; prompt: InstallPromptEvent | null };

/*
 * Whether this app can be installed is state that lives in the browser, not in React:
 * Chromium announces it with an event that may arrive long after the page has settled,
 * and it can stop being true the moment the user installs from the address bar instead.
 * So it is read as an external store rather than mirrored into component state — the
 * card then shows what the browser currently says, without a render pass spent catching
 * up with it.
 */
const listeners = new Set<() => void>();
let deferred: InstallPromptEvent | null = null;
let snapshot: InstallState | null = null;
let standaloneQuery: MediaQueryList | null = null;

function read(): InstallState {
  return {
    advice: installAdvice({
      userAgent: navigator.userAgent,
      standalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        // Safari's own flag, and the only signal iOS gives for a home-screened app.
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
      canPrompt: deferred !== null,
      touchPoints: navigator.maxTouchPoints,
    }),
    prompt: deferred,
  };
}

function publish() {
  snapshot = read();
  for (const listener of listeners) listener();
}

function onBeforeInstallPrompt(event: Event) {
  // Without this Chromium shows its own mini-infobar and never hands over the event.
  event.preventDefault();
  deferred = event as InstallPromptEvent;
  publish();
}

function onInstalled() {
  deferred = null;
  publish();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (listeners.size === 1) {
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // Installing from the address bar can flip the window into standalone mode while
    // this card is on screen.
    standaloneQuery = window.matchMedia("(display-mode: standalone)");
    standaloneQuery.addEventListener("change", publish);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standaloneQuery?.removeEventListener("change", publish);
      standaloneQuery = null;
    }
  };
}

function getSnapshot(): InstallState {
  snapshot ??= read();
  return snapshot;
}

/** On the server nothing is known about the browser, so the card renders nothing. */
function getServerSnapshot(): InstallState | null {
  return null;
}

function adviceText(t: Messages): Record<Exclude<InstallAdvice, "prompt">, string> {
  return {
    installed: t.install.installed,
    ios: t.install.ios,
    "firefox-mobile": t.install.firefoxMobile,
    "firefox-desktop": t.install.firefoxDesktop,
    menu: t.install.menu,
  };
}

/**
 * "Als App installieren".
 *
 * Two things make this awkward, and both are handled rather than hidden. The browsers
 * that can install decide *when* to say so, so the card starts as advice and upgrades
 * itself to a button when the event arrives. The browsers that cannot install never say
 * anything at all, so the card names their menu path instead of showing a control that
 * would do nothing.
 */
export function InstallApp() {
  const t = useMessages();
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [status, setStatus] = useState<"dismissed" | "failed" | null>(null);
  const [pending, setPending] = useState(false);

  async function install(prompt: InstallPromptEvent) {
    setStatus(null);
    setPending(true);
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "dismissed") setStatus("dismissed");
    } catch {
      setStatus("failed");
    } finally {
      setPending(false);
      // The event is single use. Chromium fires a fresh one later if the household is
      // still eligible; until then the card falls back to the menu route, which works.
      deferred = null;
      publish();
    }
  }

  if (state === null) return null;

  return (
    <div className="space-y-3">
      {status === "failed" ? (
        <p className="text-negative text-sm" role="alert">
          {t.install.failed}
        </p>
      ) : status === "dismissed" ? (
        <p className="text-ink-muted text-sm" role="status">
          {t.install.dismissed}
        </p>
      ) : null}

      {state.advice === "prompt" && state.prompt ? (
        <button
          type="button"
          className={buttonStyles({ variant: "primary", size: "md" })}
          onClick={() => void install(state.prompt as InstallPromptEvent)}
          disabled={pending}
        >
          {pending ? t.install.installing : t.install.button}
        </button>
      ) : (
        <p className="text-ink-muted text-sm leading-relaxed">
          {adviceText(t)[state.advice === "prompt" ? "menu" : state.advice]}
        </p>
      )}
    </div>
  );
}
