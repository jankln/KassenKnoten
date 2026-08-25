import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Time-based one-time passwords, RFC 6238.
 *
 * The second factor for the household login. Everything here is pure and takes its clock
 * as an argument, the same way `session.ts` does — a time-based algorithm whose tests
 * cannot control time is a time-based algorithm nobody can prove correct.
 *
 * HMAC-SHA1 with a 30-second step and six digits: not a choice so much as the defaults
 * every authenticator app assumes when it scans a QR code. SHA-1 is used here as a MAC
 * over a counter, which its collision weaknesses do not touch.
 *
 * The secret never reaches this module from the database — it comes from the environment,
 * so a copy of the SQLite file is not a copy of the second factor. See `lib/env.ts`.
 */

/** Seconds per step. Thirty is what every authenticator app assumes. */
export const STEP_SECONDS = 30;

const DIGITS = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encode bytes as RFC 4648 base32 without padding.
 *
 * No padding on purpose: an `otpauth://` URI carries the secret as a query parameter, and
 * the `=` characters padding would add have to be percent-encoded there. Authenticator
 * apps accept the unpadded form, and it is what every other implementation emits.
 */
export function toBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decode base32 back to bytes, or `null` for anything that is not valid base32.
 *
 * Returns `null` rather than throwing because every caller's answer to bad input is the
 * same: refuse the login, name the misconfiguration. Spaces are tolerated — people copy
 * secrets out of authenticator apps in groups of four.
 */
export function fromBase32(input: string): Uint8Array | null {
  const cleaned = input.replace(/[\s-]/g, "").replace(/=+$/, "").toUpperCase();
  if (cleaned === "") {
    return null;
  }

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of cleaned) {
    const index = ALPHABET.indexOf(character);
    if (index === -1) {
      return null;
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Uint8Array.from(bytes);
}

/** Whether a string is base32 this module can read. */
export function isBase32(input: string): boolean {
  return fromBase32(input) !== null;
}

/**
 * A fresh secret: 20 random bytes, the length RFC 4226 recommends for HMAC-SHA1 and the
 * length every authenticator app is happy with.
 */
export function generateSecret(): string {
  return toBase32(randomBytes(20));
}

/** The counter value for a moment in time. */
export function stepFor(now: Date): number {
  return Math.floor(now.getTime() / 1000 / STEP_SECONDS);
}

/**
 * The six-digit code for one counter value — RFC 4226's dynamic truncation.
 *
 * Returns `null` when the secret is not readable base32, so a misconfigured instance
 * fails as "wrong code" rather than as a stack trace on the login screen. The same
 * reasoning as `verifyPassword` in `password.ts`.
 */
export function codeForStep(secret: string, step: number): string | null {
  const key = fromBase32(secret);
  if (!key || key.length === 0) {
    return null;
  }

  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));

  const digest = createHmac("sha1", key).update(counter).digest();
  // Dynamic truncation: the low nibble of the last byte picks where to read four bytes,
  // and the top bit is masked off so the result is positive on every platform.
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** The code that is current at `now`. */
export function totpCode(secret: string, now: Date = new Date()): string | null {
  return codeForStep(secret, stepFor(now));
}

export interface VerifyResult {
  valid: boolean;
  /**
   * The counter the code belonged to, when valid. The caller needs it to refuse the same
   * code a second time — see `totp-replay.ts`.
   */
  step?: number;
}

/**
 * Check a code against the secret, allowing `window` steps of clock drift either way.
 *
 * One step of tolerance — thirty seconds in each direction — covers a phone whose clock
 * has drifted and the very common case of typing a code that expires mid-keystroke. A
 * wider window would multiply the codes an attacker may guess at any moment for no
 * practical gain.
 *
 * The comparison is time-constant. The margin this buys over a network is small, but the
 * cost of doing it right is one function call.
 */
export function verifyTotp(
  secret: string,
  code: string,
  now: Date = new Date(),
  window = 1,
): VerifyResult {
  const candidate = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(candidate)) {
    return { valid: false };
  }

  const current = stepFor(now);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = codeForStep(secret, current + offset);
    if (expected && equals(expected, candidate)) {
      return { valid: true, step: current + offset };
    }
  }
  return { valid: false };
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * The `otpauth://` URI an authenticator app scans.
 *
 * The label is `issuer:account` and the issuer is repeated as a parameter — both halves
 * are specified, and apps disagree about which one they read.
 */
export function otpauthUri({
  secret,
  issuer = "KassenKnoten",
  account = "Haushalt",
}: {
  secret: string;
  issuer?: string;
  account?: string;
}): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
