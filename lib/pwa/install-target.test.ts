import { describe, expect, it } from "vitest";
import { installAdvice, type BrowserFacts } from "./install-target";

const CHROME_DESKTOP =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1";
const SAFARI_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15";
const IPADOS =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
const FIREFOX_DESKTOP =
  "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0";
const FIREFOX_ANDROID =
  "Mozilla/5.0 (Android 14; Mobile; rv:135.0) Gecko/135.0 Firefox/135.0";

const facts = (overrides: Partial<BrowserFacts> = {}): BrowserFacts => ({
  userAgent: CHROME_DESKTOP,
  standalone: false,
  canPrompt: false,
  ...overrides,
});

describe("installAdvice", () => {
  it("offers nothing once the app runs standalone", () => {
    expect(installAdvice(facts({ standalone: true }))).toBe("installed");
  });

  it("prefers the real prompt over anything the user agent suggests", () => {
    expect(installAdvice(facts({ canPrompt: true }))).toBe("prompt");
    expect(installAdvice(facts({ userAgent: SAFARI_IOS, canPrompt: true }))).toBe(
      "prompt",
    );
  });

  it("treats being installed as stronger than a pending prompt", () => {
    expect(installAdvice(facts({ standalone: true, canPrompt: true }))).toBe(
      "installed",
    );
  });

  it("sends iPhones to the share sheet", () => {
    expect(installAdvice(facts({ userAgent: SAFARI_IOS }))).toBe("ios");
  });

  it("recognises an iPad even though it claims to be a Mac", () => {
    expect(installAdvice(facts({ userAgent: IPADOS, touchPoints: 5 }))).toBe("ios");
  });

  it("does not mistake a desktop Mac for an iPad", () => {
    expect(installAdvice(facts({ userAgent: SAFARI_MAC, touchPoints: 0 }))).toBe(
      "menu",
    );
  });

  it("separates Firefox on a phone from Firefox on a desktop", () => {
    expect(installAdvice(facts({ userAgent: FIREFOX_ANDROID }))).toBe("firefox-mobile");
    expect(installAdvice(facts({ userAgent: FIREFOX_DESKTOP }))).toBe(
      "firefox-desktop",
    );
  });

  it("falls back to the browser menu for anything else", () => {
    expect(installAdvice(facts())).toBe("menu");
  });
});
