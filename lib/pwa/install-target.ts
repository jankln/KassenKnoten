/**
 * Which installation advice a browser needs.
 *
 * Installing a web app is a browser feature, and browsers disagree about it more than
 * about anything else this app touches: Chromium fires an event the page can trigger,
 * Safari hides it in the share sheet, Firefox on the desktop cannot do it at all. The
 * naive version — render a button and hope — leaves most users pressing something that
 * does nothing.
 *
 * So the decision is made here, as a pure function of what the browser told us, and the
 * component only renders the answer. That also makes the awkward cases testable, which
 * they otherwise would not be: nobody is going to open an iPad to check a heuristic.
 */
export type InstallAdvice =
  /** Already running as an installed app. Nothing to offer. */
  | "installed"
  /** The browser handed us a deferred install prompt; a real button can trigger it. */
  | "prompt"
  /** iOS and iPadOS: every browser there installs through the share sheet. */
  | "ios"
  | "firefox-mobile"
  | "firefox-desktop"
  /** Installable, but only through the browser's own menu. */
  | "menu";

export type BrowserFacts = {
  userAgent: string;
  /** The app is running in standalone display mode, or iOS reports it as home-screened. */
  standalone: boolean;
  /** A `beforeinstallprompt` event is being held. */
  canPrompt: boolean;
  /** `navigator.maxTouchPoints` — the only way to tell an iPad from a Mac. */
  touchPoints?: number;
};

/**
 * iPadOS 13 and later identify as "Macintosh" on purpose, so the user agent alone cannot
 * separate an iPad from a desktop Mac. A touch-capable "Mac" is an iPad; a real Mac
 * reports no touch points. Safari on macOS installs through its own menu, so guessing
 * wrong here would send a Mac user hunting for a share sheet that has no such entry.
 */
function isApplePortable({ userAgent, touchPoints = 0 }: BrowserFacts): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && touchPoints > 1;
}

export function installAdvice(facts: BrowserFacts): InstallAdvice {
  if (facts.standalone) return "installed";
  // Asked before the platform checks: a browser offering the prompt outranks any guess
  // we could make from its user agent.
  if (facts.canPrompt) return "prompt";
  if (isApplePortable(facts)) return "ios";
  if (/Firefox\//i.test(facts.userAgent)) {
    return /Android|Mobile/i.test(facts.userAgent)
      ? "firefox-mobile"
      : "firefox-desktop";
  }
  return "menu";
}
