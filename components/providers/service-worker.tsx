"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes the app installable.
 *
 * It lives in the root layout rather than in the authenticated shell, so a household can
 * install KassenKnoten from the login screen and sign in from the installed app — the
 * order most people will actually do it in.
 *
 * In development it does the opposite and unregisters: `/_next/static/` chunks are
 * rebuilt in place there instead of being content-hashed, so a worker that cached them —
 * the one thing this worker does cache — would serve yesterday's code to a running dev
 * server, and the symptom looks like a bug in the app rather than in the cache.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .catch(() => {});
      return;
    }

    // After load: registering during hydration competes with the page's own requests for
    // no benefit — nothing on the first paint depends on the worker.
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        // A failed registration costs installability, not the app. Say so and move on.
        console.error("Service worker registration failed.", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
