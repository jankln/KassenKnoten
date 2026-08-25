import { describe, expect, it } from "vitest";
import {
  codeForStep,
  fromBase32,
  generateSecret,
  isBase32,
  otpauthUri,
  stepFor,
  toBase32,
  totpCode,
  verifyTotp,
} from "./totp";

/**
 * The RFC 6238 reference secret: the ASCII string "12345678901234567890", which is what
 * the published test vectors in its Appendix B are computed against.
 */
const RFC_SECRET = toBase32(new TextEncoder().encode("12345678901234567890"));

const at = (seconds: number) => new Date(seconds * 1000);

describe("base32", () => {
  /** RFC 4648 section 10, minus the padding this module deliberately omits. */
  it("matches the RFC 4648 test vectors", () => {
    const encode = (text: string) => toBase32(new TextEncoder().encode(text));
    expect(encode("f")).toBe("MY");
    expect(encode("fo")).toBe("MZXQ");
    expect(encode("foo")).toBe("MZXW6");
    expect(encode("foob")).toBe("MZXW6YQ");
    expect(encode("fooba")).toBe("MZXW6YTB");
    expect(encode("foobar")).toBe("MZXW6YTBOI");
  });

  it("round-trips arbitrary bytes", () => {
    const bytes = Uint8Array.from([0, 1, 127, 128, 255, 42, 7]);
    expect(fromBase32(toBase32(bytes))).toEqual(bytes);
  });

  it("tolerates the spacing people copy out of authenticator apps", () => {
    expect(fromBase32("MZXW 6YTB OI")).toEqual(fromBase32("MZXW6YTBOI"));
    expect(fromBase32("mzxw6ytboi")).toEqual(fromBase32("MZXW6YTBOI"));
    // Padding is not emitted, but a secret pasted from elsewhere may carry it.
    expect(fromBase32("MY======")).toEqual(fromBase32("MY"));
  });

  it("rejects anything that is not base32 instead of guessing", () => {
    // 0, 1 and 8 are deliberately absent from the alphabet.
    expect(fromBase32("MZXW0YTB")).toBeNull();
    expect(fromBase32("nicht base32!")).toBeNull();
    expect(fromBase32("")).toBeNull();
    expect(isBase32("MZXW6YTBOI")).toBe(true);
    expect(isBase32("MZXW0YTB")).toBe(false);
  });
});

/**
 * The published vectors from RFC 6238 Appendix B, SHA-1 column.
 *
 * The RFC prints eight digits; six-digit codes are the last six of those, because the
 * final step of the algorithm is `binary % 10^digits`. These are the real proof that this
 * implementation agrees with every authenticator app rather than merely with itself.
 */
describe("RFC 6238 test vectors", () => {
  const vectors: [seconds: number, code: string][] = [
    [59, "287082"],
    [1_111_111_109, "081804"],
    [1_111_111_111, "050471"],
    [1_234_567_890, "005924"],
    [2_000_000_000, "279037"],
    [20_000_000_000, "353130"],
  ];

  for (const [seconds, expected] of vectors) {
    it(`produces ${expected} at ${seconds} s`, () => {
      expect(totpCode(RFC_SECRET, at(seconds))).toBe(expected);
    });
  }

  it("counts steps of thirty seconds from the epoch", () => {
    expect(stepFor(at(0))).toBe(0);
    expect(stepFor(at(29))).toBe(0);
    expect(stepFor(at(30))).toBe(1);
    expect(stepFor(at(59))).toBe(1);
  });
});

describe("verifyTotp", () => {
  const now = at(1_234_567_890);

  it("accepts the current code and reports which step it was", () => {
    const code = totpCode(RFC_SECRET, now)!;
    const result = verifyTotp(RFC_SECRET, code, now);
    expect(result.valid).toBe(true);
    expect(result.step).toBe(stepFor(now));
  });

  it("accepts one step of drift in each direction", () => {
    const previous = codeForStep(RFC_SECRET, stepFor(now) - 1)!;
    const next = codeForStep(RFC_SECRET, stepFor(now) + 1)!;

    expect(verifyTotp(RFC_SECRET, previous, now).step).toBe(stepFor(now) - 1);
    expect(verifyTotp(RFC_SECRET, next, now).step).toBe(stepFor(now) + 1);
  });

  it("refuses a code from further back than the window", () => {
    const stale = codeForStep(RFC_SECRET, stepFor(now) - 2)!;
    expect(verifyTotp(RFC_SECRET, stale, now).valid).toBe(false);
  });

  it("refuses a code from five minutes ago", () => {
    const old = totpCode(RFC_SECRET, at(1_234_567_890 - 300))!;
    expect(verifyTotp(RFC_SECRET, old, now).valid).toBe(false);
  });

  it("ignores the spaces a phone keyboard likes to insert", () => {
    const code = totpCode(RFC_SECRET, now)!;
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotp(RFC_SECRET, spaced, now).valid).toBe(true);
  });

  it("refuses anything that is not six digits", () => {
    expect(verifyTotp(RFC_SECRET, "", now).valid).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345", now).valid).toBe(false);
    expect(verifyTotp(RFC_SECRET, "1234567", now).valid).toBe(false);
    expect(verifyTotp(RFC_SECRET, "abcdef", now).valid).toBe(false);
  });

  /** A misconfigured instance must read as "wrong code", never as a crashing login page. */
  it("refuses rather than throws when the secret is unusable", () => {
    expect(verifyTotp("nicht base32!", "000000", now).valid).toBe(false);
    expect(verifyTotp("", "000000", now).valid).toBe(false);
    expect(codeForStep("nicht base32!", 1)).toBeNull();
  });
});

describe("generateSecret", () => {
  it("produces a readable 160-bit secret", () => {
    const secret = generateSecret();
    expect(isBase32(secret)).toBe(true);
    expect(fromBase32(secret)).toHaveLength(20);
  });

  it("does not repeat itself", () => {
    expect(generateSecret()).not.toBe(generateSecret());
  });
});

describe("otpauthUri", () => {
  it("carries everything an authenticator app needs to scan", () => {
    const uri = otpauthUri({ secret: "MZXW6YTBOI" });
    expect(uri.startsWith("otpauth://totp/KassenKnoten:Haushalt?")).toBe(true);

    const params = new URL(uri).searchParams;
    expect(params.get("secret")).toBe("MZXW6YTBOI");
    expect(params.get("issuer")).toBe("KassenKnoten");
    expect(params.get("algorithm")).toBe("SHA1");
    expect(params.get("digits")).toBe("6");
    expect(params.get("period")).toBe("30");
  });
});
