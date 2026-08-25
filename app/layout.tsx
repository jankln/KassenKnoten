import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Bricolage_Grotesque, IBM_Plex_Mono, Manrope } from "next/font/google";
import { ServiceWorker } from "@/components/providers/service-worker";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "KassenKnoten",
    template: "%s · KassenKnoten",
  },
  description: "Haushaltsfinanzen planen: Einnahmen, Fixkosten und Rücklagen.",
  applicationName: "KassenKnoten",
  // Next links `app/manifest.ts` on its own, but declaring `icons` at all replaces the
  // icons it would have inferred from the file convention — so `app/icon.svg` is named
  // here too, or the browser tab silently loses it. iOS ignores SVG and takes the
  // largest PNG offered, which is what the Apple entry is for.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  // Installed on iOS, the app runs without Safari's chrome and takes this as its name
  // under the home screen icon.
  appleWebApp: {
    capable: true,
    title: "KassenKnoten",
    statusBarStyle: "default",
  },
  // Next emits the standardised `mobile-web-app-capable` for the line above. iOS before
  // 16.4 only understands the vendor-prefixed spelling and otherwise opens the home
  // screen icon in a normal Safari tab, so both are sent.
  other: { "apple-mobile-web-app-capable": "yes" },
  // Private, self-hosted instance — never index it, even if it is reachable.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#16181d" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // next-themes writes an inline script that applies the stored theme before the first
  // paint. Under the CSP in `proxy.ts` an unsigned inline script is blocked, and the
  // whole point of that script is to prevent a flash of the wrong theme — so it needs
  // the same nonce the proxy issued for this request.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${bricolage.variable} ${manrope.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider nonce={nonce}>{children}</ThemeProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
