import { readFileSync } from "node:fs";
import { z } from "zod";
import { isBase32 } from "./auth/totp";

/**
 * Server environment.
 *
 * Parsed once, on first access, and never in the browser. A misconfigured instance must
 * fail loudly at startup rather than half-work: an app that silently falls back to "no
 * password required" is worse than one that refuses to boot.
 *
 * Messages here are English on purpose — they are read by whoever self-hosts the
 * instance, alongside the English README and .env.example. Everything the household sees
 * in the browser is German.
 */
const schema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),

  DATABASE_PATH: z.string().min(1).default("./data/kassenknoten.db"),

  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters (openssl rand -base64 32)"),

  // Only "local" for now. OIDC (Authentik) arrives in F04b; accepting the value before
  // the code exists would lock the household out of their own instance.
  AUTH_MODE: z.literal("local").default("local"),

  // Accepted raw or base64-encoded — see resolvePasswordHash for why that matters.
  LOCAL_PASSWORD_HASH: z.string().optional(),
  /** Path to a file containing the hash, for Docker secrets. Wins over the variable. */
  LOCAL_PASSWORD_HASH_FILE: z.string().optional(),

  /**
   * Base32 secret for the second factor. Optional: unset means no second factor and a
   * login that behaves exactly as it did before. There is deliberately no AUTH_MODE value
   * for this — a configuration flag that silently disables a security feature is worse
   * than none at all.
   */
  TOTP_SECRET: z.string().optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema> & {
  LOCAL_PASSWORD_HASH: string;
  /** Present only when a second factor is configured. */
  TOTP_SECRET?: string;
};

const ARGON2ID_PREFIX = "$argon2id$";

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) {
    return cached;
  }

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(formatIssues(parsed.error));
  }

  const totpSecret = resolveTotpSecret(parsed.data);

  // The raw value is dropped rather than spread through. An untouched `TOTP_SECRET=` line
  // parses as the empty string, and spreading it would leave the key present-but-empty:
  // truthiness checks would see 2FA as off while presence checks saw it as on. That
  // disagreement is not academic — it is a login screen demanding a code that the server
  // does not verify.
  const { TOTP_SECRET: _raw, ...rest } = parsed.data;

  cached = {
    ...rest,
    LOCAL_PASSWORD_HASH: resolvePasswordHash(parsed.data),
    ...(totpSecret ? { TOTP_SECRET: totpSecret } : {}),
  };
  return cached;
}

/** Test seam: forces the next `getEnv()` to re-read `process.env`. */
export function resetEnvCache(): void {
  cached = undefined;
}

/**
 * Whether sign-in requires a code from an authenticator app.
 *
 * One predicate with two callers — the login screen, which decides whether to render the
 * field, and the sign-in action, which decides whether to verify it. Asking the question
 * two different ways is how a form comes to demand something nothing checks.
 */
export function requiresSecondFactor(env: Env): boolean {
  return env.TOTP_SECRET !== undefined;
}

/** True when cookies may carry the Secure attribute, i.e. the app is served over TLS. */
export function isSecureOrigin(env: Env): boolean {
  return new URL(env.APP_URL).protocol === "https:";
}

/**
 * Resolve the password hash from a file or the environment.
 *
 * An argon2id hash is full of `$` characters, and every `.env` parser and
 * docker-compose file treats those as variable references — `$argon2id$v=19$...`
 * silently becomes `=19=19456,t=2,p=1`. That is a genuinely painful hour for whoever
 * self-hosts this, so the hash may also be supplied base64-encoded or through a file,
 * and a mangled value is named for what it is instead of "invalid".
 */
function resolvePasswordHash(env: z.infer<typeof schema>): string {
  const fromFile = env.LOCAL_PASSWORD_HASH_FILE
    ? readFileSync(env.LOCAL_PASSWORD_HASH_FILE, "utf8").trim()
    : undefined;
  const raw = fromFile ?? env.LOCAL_PASSWORD_HASH?.trim();

  if (!raw) {
    throw new Error(
      "Configuration error:\n" +
        "  LOCAL_PASSWORD_HASH is required for AUTH_MODE=local.\n" +
        "  Generate one with: npm run auth:hash",
    );
  }

  if (raw.startsWith(ARGON2ID_PREFIX)) {
    return raw;
  }

  const decoded = decodeBase64(raw);
  if (decoded?.startsWith(ARGON2ID_PREFIX)) {
    return decoded;
  }

  if (raw.includes("m=") || raw.includes("=19")) {
    throw new Error(
      "Configuration error:\n" +
        "  LOCAL_PASSWORD_HASH lost its $ characters — whatever read your .env or\n" +
        "  compose file expanded them as variables.\n" +
        "  Use the base64 form printed by: npm run auth:hash",
    );
  }

  throw new Error(
    "Configuration error:\n" +
      "  LOCAL_PASSWORD_HASH is neither an argon2id hash nor base64 of one.\n" +
      "  Generate a valid value with: npm run auth:hash",
  );
}

/**
 * Read the second-factor secret, or nothing when 2FA is switched off.
 *
 * A secret that is set but unreadable is refused at startup rather than at the login
 * screen. The alternative — treating it as absent — would silently drop the second factor
 * from an instance whose owner believes it is protected, which is the worst outcome
 * available here. An empty value counts as "not configured", because that is what an
 * untouched `TOTP_SECRET=` line in `.env.example` means.
 *
 * Base32 is `A–Z2–7`, so unlike the argon2id hash it carries no `$` for a .env parser or
 * docker-compose to expand away, and needs no base64 wrapper to survive them.
 */
function resolveTotpSecret(env: z.infer<typeof schema>): string | undefined {
  const raw = env.TOTP_SECRET?.trim();
  if (!raw) {
    return undefined;
  }
  if (!isBase32(raw)) {
    throw new Error(
      "Configuration error:\n" +
        "  TOTP_SECRET is not valid base32.\n" +
        "  Generate a valid value with: npm run auth:totp",
    );
  }
  return raw;
}

function decodeBase64(value: string): string | undefined {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return Buffer.from(decoded, "utf8").toString("base64").replace(/=+$/, "") ===
      value.replace(/=+$/, "")
      ? decoded
      : undefined;
  } catch {
    return undefined;
  }
}

function formatIssues(error: z.ZodError): string {
  const lines = error.issues.map(
    (issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
  return `Configuration error:\n${lines.join("\n")}\n\nSee .env.example for the full list.`;
}
