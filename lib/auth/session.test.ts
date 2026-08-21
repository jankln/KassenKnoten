import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  readSessionToken,
  shouldRefresh,
  SESSION_TTL_SECONDS,
  type Identity,
} from "./session";

const SECRET = "test-secret-that-is-long-enough-to-be-real";
const OTHER_SECRET = "a-completely-different-secret-of-good-length";
const HOUSEHOLD: Identity = { subject: "household", method: "local" };
const NOW = new Date("2026-08-21T12:00:00Z");

function later(seconds: number): Date {
  return new Date(NOW.getTime() + seconds * 1000);
}

describe("session tokens", () => {
  it("round-trips an identity", async () => {
    const token = await createSessionToken(
      {
        subject: "jan@example.com",
        method: "oidc",
        name: "Jan",
        email: "jan@example.com",
      },
      SECRET,
      NOW,
    );
    const session = await readSessionToken(token, SECRET, NOW);

    expect(session).toMatchObject({
      subject: "jan@example.com",
      method: "oidc",
      name: "Jan",
      email: "jan@example.com",
    });
    expect(session?.expiresAt).toBe(session!.issuedAt + SESSION_TTL_SECONDS);
  });

  it("never exposes its contents in the cookie value", async () => {
    const token = await createSessionToken(
      { subject: "jan@example.com", method: "local", name: "Jan" },
      SECRET,
      NOW,
    );
    expect(token).not.toContain("jan@example.com");
    expect(token).not.toContain("Jan");
  });

  it("rejects a token once it has expired", async () => {
    const token = await createSessionToken(HOUSEHOLD, SECRET, NOW);
    expect(
      await readSessionToken(token, SECRET, later(SESSION_TTL_SECONDS - 10)),
    ).not.toBeNull();
    expect(
      await readSessionToken(token, SECRET, later(SESSION_TTL_SECONDS + 10)),
    ).toBeNull();
  });

  it("rejects a token encrypted under a different secret", async () => {
    const token = await createSessionToken(HOUSEHOLD, SECRET, NOW);
    expect(await readSessionToken(token, OTHER_SECRET, NOW)).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(HOUSEHOLD, SECRET, NOW);
    const parts = token.split(".");
    const tampered = [...parts.slice(0, 3), "AAAA" + parts[3]?.slice(4), parts[4]].join(
      ".",
    );
    expect(await readSessionToken(tampered, SECRET, NOW)).toBeNull();
  });

  it("rejects nonsense and missing tokens", async () => {
    expect(await readSessionToken(undefined, SECRET, NOW)).toBeNull();
    expect(await readSessionToken("", SECRET, NOW)).toBeNull();
    expect(await readSessionToken("not-a-token", SECRET, NOW)).toBeNull();
  });
});

describe("shouldRefresh", () => {
  it("leaves a fresh session alone", async () => {
    const token = await createSessionToken(HOUSEHOLD, SECRET, NOW);
    const session = await readSessionToken(token, SECRET, NOW);
    expect(shouldRefresh(session!, later(60))).toBe(false);
  });

  it("re-issues once past the halfway point", async () => {
    const token = await createSessionToken(HOUSEHOLD, SECRET, NOW);
    const session = await readSessionToken(token, SECRET, NOW);
    expect(shouldRefresh(session!, later(SESSION_TTL_SECONDS / 2 + 60))).toBe(true);
  });
});
