"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getEnv, requiresSecondFactor } from "@/lib/env";
import { de } from "@/lib/i18n/de";
import { endSession, startSession } from "./current-session";
import { verifyPassword } from "./password";
import { loginLimiter } from "./rate-limit";
import { verifyTotp } from "./totp";
import { loginReplayGuard } from "./totp-replay";

export interface LoginState {
  error?: string;
}

const schema = z.object({
  password: z.string().min(1),
  code: z.string().trim().optional(),
});

/**
 * Sign in with the shared household password, and — when `TOTP_SECRET` is configured —
 * a six-digit code from an authenticator app.
 *
 * Both factors arrive in one submit. With a single shared password there is no "which
 * user is this" step for a two-stage flow to serve, and staging it would need a
 * half-authenticated intermediate token: another cookie, another expiry, another thing to
 * get wrong for no gain in security.
 *
 * The failure message never says *which* factor was wrong. Telling someone who is
 * guessing that they already have the password right hands them half the answer.
 *
 * One rate limiter covers both. It is only reset on a complete success, so a wrong code
 * spends an attempt exactly like a wrong password — five tries per quarter hour against a
 * million possible codes is the whole brute-force story, and a second limiter for the
 * code alone would be ballast.
 */
export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const copy = de.login;
  const env = getEnv();
  const client = await clientKey();

  const limit = loginLimiter.check(client);
  if (!limit.allowed) {
    return { error: copy.throttled(minutes(limit.retryAfterMs)) };
  }

  const parsed = schema.safeParse({
    password: formData.get("password"),
    code: formData.get("code") ?? "",
  });
  if (!parsed.success) {
    return { error: copy.passwordMissing };
  }

  const valid = await verifyPassword(env.LOCAL_PASSWORD_HASH, parsed.data.password);
  if (!valid) {
    return { error: copy.failed };
  }

  if (requiresSecondFactor(env)) {
    const code = parsed.data.code ?? "";
    if (code === "") {
      return { error: copy.codeMissing };
    }

    const result = verifyTotp(env.TOTP_SECRET ?? "", code);
    if (!result.valid || result.step === undefined) {
      return { error: copy.failed };
    }

    // A code stays valid for its whole step, and for up to ninety seconds counting the
    // tolerance either way. Spending it here is what makes it one-time.
    if (!loginReplayGuard.consume(result.step)) {
      return { error: copy.codeUsed };
    }
  }

  loginLimiter.reset(client);
  await startSession({ subject: "household", method: "local" });
  redirect("/");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/login");
}

/**
 * Identify the client for throttling. Behind a reverse proxy this relies on
 * X-Forwarded-For being set — see the deployment notes in the README.
 */
async function clientKey(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || store.get("x-real-ip") || "unknown";
}

function minutes(ms: number): string {
  const value = Math.max(1, Math.ceil(ms / 60_000));
  return value === 1 ? de.login.oneMinute : de.login.minutes(value);
}
