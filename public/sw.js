/**
 * KassenKnoten's service worker.
 *
 * Its job is narrow on purpose: make the app installable, and say something useful when
 * the phone has no connection. It is deliberately *not* an offline mode.
 *
 * Every page of this app is server-rendered money for one household. A worker that
 * cached those responses would write balances into a store that outlives sign-out and is
 * readable by anyone who picks up the device, and it would later serve last week's
 * figures as if they were this month's. So the cache has an allowlist of exactly three
 * things, none of which is household data:
 *
 *   1. the offline screen,
 *   2. the app icons,
 *   3. `/_next/static/` assets, which are content-hashed and therefore safe to keep.
 *
 * Everything else — every page, every server action, every API route — goes to the
 * network and is never stored. A failed navigation shows the offline screen instead.
 */

const CACHE = "kassenknoten-shell-v1";

/** Fetched on install so the offline screen is available exactly when the network is not. */
const PRECACHE = ["/offline", "/icons/icon-192.png"];

/** Content-hashed or static-by-nature, and free of household data. */
function isCacheable(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/offline"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // One missing file must not abort the install and leave the app uninstallable.
      await Promise.allSettled(PRECACHE.map((path) => cache.add(path)));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== CACHE).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isCacheable(url)) {
    // Cache first: these never change behind a stable URL.
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
    return;
  }

  if (request.mode === "navigate") {
    // Network only, with the offline screen as the failure case. Nothing is stored: a
    // dashboard held in a cache is a dashboard that can be wrong and can be read by the
    // next person to open the laptop.
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match("/offline");
          return (
            cached ??
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
  }
});
