import type { MetadataRoute } from "next";
import { getMessages } from "@/server/i18n";

/**
 * What the browser needs in order to offer "install".
 *
 * The interesting part is `display: "standalone"`. Installed, KassenKnoten opens without
 * an address bar, which is the whole point on a phone: the household plan should feel
 * like the app it replaced, not like a bookmark. `start_url` is the dashboard; if the
 * session has expired the proxy sends the user to the login screen from there, so the
 * installed app has the same front door as the browser.
 *
 * `id` is pinned so that changing `start_url` later updates the installed app instead of
 * offering a second copy of it alongside the first.
 */
export default function manifest(): MetadataRoute.Manifest {
  const t = getMessages();
  return {
    id: "/",
    name: t.app.name,
    short_name: t.app.name,
    description: t.app.tagline,
    lang: "de",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Browsers that cannot do standalone fall down this list rather than to a plain tab.
    display_override: ["standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#f6f3ee",
    theme_color: "#f6f3ee",
    categories: ["finance", "productivity", "utilities"],
    icons: [
      // "any" is used as it is drawn, so it carries its own rounded paper ground.
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // "maskable" is cropped to whatever shape the launcher uses; only the inner circle
      // is guaranteed to survive, so this variant bleeds its ground to every edge.
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: t.nav.fixedCosts, url: "/fixkosten" },
      { name: t.nav.savings, url: "/sparen" },
    ],
  };
}
