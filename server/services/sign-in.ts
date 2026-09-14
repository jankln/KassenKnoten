import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { isAllowed, isEmail, normaliseEmail } from "@/lib/auth/allowlist";
import { effectiveMethods, type MethodSet } from "@/lib/auth/methods";
import type { Session } from "@/lib/auth/session";
import { configuredMethods, startingMethods, type Env } from "@/lib/env";

/**
 * How this household signs in, after install.
 *
 * `.env` decides what is possible and where things start; this is where the household's
 * later choices live. Two rows in `app_setting`, each absent until the settings screen
 * first saves it — and while absent, the environment answers. That is what makes
 * `AUTH_MODE` and `OIDC_ALLOWED_EMAILS` a starting point rather than a second, competing
 * source of truth.
 *
 * Neither row holds a secret. The client secret, the password hash and the TOTP secret
 * stay in the environment, so a copy of the database is still not a way in.
 */

// Under `auth.`: instance configuration, kept out of backups and across restores
// (instance-settings.ts).
const METHODS_KEY = "auth.methods";
const ALLOWLIST_KEY = "auth.allowedEmails";

export interface SignInState {
  /** What the environment makes possible. */
  configured: MethodSet;
  /** What the household has switched on — or `AUTH_MODE`, until it has. */
  chosen: MethodSet;
  /** What actually works on the login screen right now. */
  effective: MethodSet;
  /** Whether `chosen` comes from the settings or still from `AUTH_MODE`. */
  chosenInSettings: boolean;
  allowlist: string[];
  allowlistInSettings: boolean;
}

export function getSignInState(env: Env, db: Db = getDb()): SignInState {
  const configured = configuredMethods(env);
  const storedMethods = readMethods(db);
  const chosen = storedMethods ?? startingMethods(env);
  const storedAllowlist = readAllowlist(db);

  return {
    configured,
    chosen,
    effective: effectiveMethods(configured, chosen),
    chosenInSettings: storedMethods !== undefined,
    allowlist: storedAllowlist ?? env.oidc?.allowedEmails ?? [],
    allowlistInSettings: storedAllowlist !== undefined,
  };
}

/**
 * Whether a session that decrypts correctly is still allowed in.
 *
 * A cookie is valid for a week, and the household may in the meantime switch off the
 * method that issued it or take an address off the list. Both have to take effect on the
 * next request rather than whenever the cookie happens to expire — otherwise removing
 * somebody is a promise with a seven-day delay.
 */
export function sessionStillAllowed(session: Session, state: SignInState): boolean {
  if (!state.effective[session.method]) {
    return false;
  }
  if (session.method === "oidc") {
    return isAllowed(state.allowlist, session.email);
  }
  return true;
}

export function saveMethods(methods: MethodSet, db: Db = getDb()): void {
  write(db, METHODS_KEY, { local: methods.local, oidc: methods.oidc });
}

export function saveAllowlist(emails: readonly string[], db: Db = getDb()): void {
  const normalised = [...new Set(emails.map(normaliseEmail))].sort();
  write(db, ALLOWLIST_KEY, normalised);
}

function readMethods(db: Db): MethodSet | undefined {
  const value = read(db, METHODS_KEY);
  if (
    value &&
    typeof value === "object" &&
    typeof (value as MethodSet).local === "boolean" &&
    typeof (value as MethodSet).oidc === "boolean"
  ) {
    return { local: (value as MethodSet).local, oidc: (value as MethodSet).oidc };
  }
  return undefined;
}

function readAllowlist(db: Db): string[] | undefined {
  const value = read(db, ALLOWLIST_KEY);
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter(
    (entry): entry is string => typeof entry === "string" && isEmail(entry),
  );
}

function read(db: Db, key: string): unknown {
  return db
    .select({ value: schema.appSetting.value })
    .from(schema.appSetting)
    .where(eq(schema.appSetting.key, key))
    .get()?.value;
}

function write(db: Db, key: string, value: unknown): void {
  db.insert(schema.appSetting)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.appSetting.key,
      set: { value, updatedAt: new Date() },
    })
    .run();
}
