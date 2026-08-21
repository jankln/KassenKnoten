"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getEnv } from "@/lib/env";
import { endSession, startSession } from "./current-session";
import { verifyPassword } from "./password";
import { loginLimiter } from "./rate-limit";

export interface LoginState {
  error?: string;
}

const schema = z.object({
  password: z.string().min(1),
});

/**
 * Sign in with the shared household password.
 *
 * Failure messages stay vague about *why* it failed, but precise about what to do next.
 * Attempts are throttled per client so the password cannot be guessed at machine speed.
 */
export async function signIn(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const env = getEnv();
  const client = await clientKey();

  const limit = loginLimiter.check(client);
  if (!limit.allowed) {
    return { error: `Zu viele Versuche. Weiter in ${minutes(limit.retryAfterMs)}.` };
  }

  const parsed = schema.safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: "Bitte das Haushalts-Passwort eingeben." };
  }

  const valid = await verifyPassword(env.LOCAL_PASSWORD_HASH, parsed.data.password);
  if (!valid) {
    return { error: "Das Passwort stimmt nicht." };
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
  return value === 1 ? "einer Minute" : `${value} Minuten`;
}
