import { afterEach, describe, expect, it } from "vitest";
import { createDb } from "@/db/client";
import * as schema from "@/db/schema";
import type { Env } from "@/lib/env";
import type { Session } from "@/lib/auth/session";
import {
  getSignInState,
  saveAllowlist,
  saveMethods,
  sessionStillAllowed,
} from "./sign-in";

const handle = createDb(":memory:");

afterEach(() => {
  handle.db.delete(schema.appSetting).run();
});

const base = {
  APP_URL: "http://localhost:3000",
  DATABASE_PATH: ":memory:",
  SESSION_SECRET: "a-secret-that-is-definitely-long-enough",
  NODE_ENV: "test",
  LOCAL_PASSWORD_HASH: "$argon2id$...",
} as const;

const withProvider: Env = {
  ...base,
  AUTH_MODE: "local",
  oidc: {
    issuer: "https://auth.example.com/application/o/kassenknoten/",
    clientId: "kassenknoten",
    allowedEmails: ["alex@example.com"],
  },
};

function session(method: "local" | "oidc", email?: string): Session {
  return {
    subject: method === "local" ? "household" : "user-1",
    method,
    ...(email ? { email } : {}),
    issuedAt: 0,
    expiresAt: 0,
  };
}

describe("getSignInState", () => {
  it("follows the environment until the settings have been saved", () => {
    const state = getSignInState(withProvider, handle.db);
    expect(state).toEqual({
      configured: { local: true, oidc: true },
      chosen: { local: true, oidc: false },
      effective: { local: true, oidc: false },
      chosenInSettings: false,
      allowlist: ["alex@example.com"],
      allowlistInSettings: false,
    });
  });

  it("lets the settings win once saved", () => {
    saveMethods({ local: true, oidc: true }, handle.db);
    saveAllowlist(
      ["Robin@example.com", "alex@example.com", "robin@example.com"],
      handle.db,
    );

    const state = getSignInState({ ...withProvider, AUTH_MODE: "local" }, handle.db);
    expect(state.effective).toEqual({ local: true, oidc: true });
    expect(state.chosenInSettings).toBe(true);
    expect(state.allowlist).toEqual(["alex@example.com", "robin@example.com"]);
    expect(state.allowlistInSettings).toBe(true);
  });

  it("brings the password back when the chosen provider is removed from the environment", () => {
    saveMethods({ local: false, oidc: true }, handle.db);
    const withoutProvider: Env = { ...base, AUTH_MODE: "local" };
    expect(getSignInState(withoutProvider, handle.db).effective).toEqual({
      local: true,
      oidc: false,
    });
  });
});

describe("sessionStillAllowed", () => {
  it("ends a session whose method has been switched off", () => {
    saveMethods({ local: false, oidc: true }, handle.db);
    const state = getSignInState(withProvider, handle.db);
    expect(sessionStillAllowed(session("local"), state)).toBe(false);
    expect(sessionStillAllowed(session("oidc", "alex@example.com"), state)).toBe(true);
  });

  it("ends a provider session whose address has left the list", () => {
    saveMethods({ local: true, oidc: true }, handle.db);
    saveAllowlist(["robin@example.com"], handle.db);
    const state = getSignInState(withProvider, handle.db);
    expect(sessionStillAllowed(session("oidc", "alex@example.com"), state)).toBe(false);
    expect(sessionStillAllowed(session("local"), state)).toBe(true);
  });
});
