import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { parseAllowlist } from "./auth/allowlist";
import { methodsForMode, type MethodSet } from "./auth/methods";
import { CALLBACK_PATH } from "./auth/oidc";
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
/**
 * How to produce a value, for the message that says it is missing or wrong.
 *
 * Both ways, because both kinds of people read these: whoever pulled the image has Docker
 * and no `npm`, whoever cloned the repository has both. A message that names only the
 * checkout's command sends the first group looking for a tool they were promised they
 * would not need.
 */
function howToMake(script: string, npmScript: string): string {
  return (
    `  Generate one with:  docker run -it --rm ghcr.io/jankln/kassenknoten node scripts/${script}\n` +
    `  or from a checkout: npm run ${npmScript}`
  );
}

const schema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),

  DATABASE_PATH: z.string().min(1).default("./data/kassenknoten.db"),

  SESSION_SECRET: z
    .string()
    .min(
      32,
      "SESSION_SECRET must be at least 32 characters — docker run --rm ghcr.io/jankln/kassenknoten node scripts/session-secret.ts",
    ),

  /**
   * Which sign-in methods are switched on **before anyone has changed it in the
   * settings**: the shared password, the identity provider, or both. Once the household
   * saves Settings → Sign-in, that choice wins and this value is only the starting point.
   */
  AUTH_MODE: z
    .enum(["local", "oidc", "both"], {
      error: 'AUTH_MODE must be "local", "oidc" or "both"',
    })
    .default("local"),

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

  /**
   * The identity provider. All optional: an instance without them signs in with the
   * password exactly as before. Issuer and client id come as a pair — see resolveOidc.
   */
  OIDC_ISSUER: z.string().optional(),
  OIDC_CLIENT_ID: z.string().optional(),
  /** Omitted for a public client; PKCE is then what binds the code to the browser. */
  OIDC_CLIENT_SECRET: z.string().optional(),
  /** Path to a file containing the client secret, for Docker secrets. Wins over the variable. */
  OIDC_CLIENT_SECRET_FILE: z.string().optional(),
  /** What the sign-in button calls the provider, e.g. "Authentik". */
  OIDC_PROVIDER_NAME: z.string().optional(),
  /** Seeds the allowlist until the household edits it in the settings. */
  OIDC_ALLOWED_EMAILS: z.string().optional(),

  /** Where automatic backups go. Defaults to `backups/` beside the database. */
  BACKUP_DIR: z.string().optional(),
  /**
   * How many distinct backups are kept. `0` switches automatic backups off. An empty
   * value — the untouched line in `.env.example` — means the default.
   */
  BACKUP_KEEP: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce
      .number({ error: "BACKUP_KEEP must be a whole number, 0 to switch backups off" })
      .int("BACKUP_KEEP must be a whole number, 0 to switch backups off")
      .min(0, "BACKUP_KEEP must be a whole number, 0 to switch backups off")
      .default(14),
  ),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

/** A configured identity provider, with every value already checked. */
export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
  providerName?: string;
  /** From OIDC_ALLOWED_EMAILS, normalised. The database copy wins once it exists. */
  allowedEmails: string[];
}

type Parsed = z.infer<typeof schema>;

export type Env = Omit<
  Parsed,
  | "LOCAL_PASSWORD_HASH"
  | "TOTP_SECRET"
  | "OIDC_ISSUER"
  | "OIDC_CLIENT_ID"
  | "OIDC_CLIENT_SECRET"
  | "OIDC_CLIENT_SECRET_FILE"
  | "OIDC_PROVIDER_NAME"
  | "OIDC_ALLOWED_EMAILS"
  | "BACKUP_DIR"
  | "BACKUP_KEEP"
> & {
  /** Present only when password sign-in is configured. */
  LOCAL_PASSWORD_HASH?: string;
  /** Present only when a second factor is configured. */
  TOTP_SECRET?: string;
  /** Present only when an identity provider is configured. */
  oidc?: OidcConfig;
  /** Present only when automatic backups are on. */
  backups?: { directory: string; keep: number };
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

  const data = parsed.data;
  const totpSecret = resolveTotpSecret(data);
  const oidc = resolveOidc(data);
  const passwordHash = resolvePasswordHash(data, {
    required: data.AUTH_MODE !== "oidc",
  });

  if (data.AUTH_MODE !== "local" && !oidc) {
    throw new Error(
      "Configuration error:\n" +
        `  AUTH_MODE=${data.AUTH_MODE} needs an identity provider.\n` +
        "  Set OIDC_ISSUER and OIDC_CLIENT_ID, or use AUTH_MODE=local.",
    );
  }
  // Provider-only from the first start, and nobody on the list: the very first sign-in
  // would be refused, and the settings where the list is kept are behind that sign-in.
  if (data.AUTH_MODE === "oidc" && oidc?.allowedEmails.length === 0) {
    throw new Error(
      "Configuration error:\n" +
        "  AUTH_MODE=oidc needs at least one address in OIDC_ALLOWED_EMAILS,\n" +
        "  or nobody could sign in to reach the settings where the list is kept.",
    );
  }

  // Raw optional values are dropped rather than carried through. An untouched
  // `TOTP_SECRET=` line parses as the empty string, and keeping the key present-but-empty
  // would let truthiness checks see 2FA as off while presence checks saw it as on. That
  // disagreement is not academic — it is a login screen demanding a code that the server
  // does not verify.
  const rest: Partial<Parsed> = { ...data };
  for (const key of [
    "LOCAL_PASSWORD_HASH",
    "TOTP_SECRET",
    "OIDC_ISSUER",
    "OIDC_CLIENT_ID",
    "OIDC_CLIENT_SECRET",
    "OIDC_CLIENT_SECRET_FILE",
    "OIDC_PROVIDER_NAME",
    "OIDC_ALLOWED_EMAILS",
    "BACKUP_DIR",
    "BACKUP_KEEP",
  ] as const) {
    delete rest[key];
  }

  cached = {
    ...(rest as Omit<Parsed, "LOCAL_PASSWORD_HASH">),
    ...(passwordHash ? { LOCAL_PASSWORD_HASH: passwordHash } : {}),
    ...(totpSecret ? { TOTP_SECRET: totpSecret } : {}),
    ...(oidc ? { oidc } : {}),
    ...(data.BACKUP_KEEP > 0
      ? {
          backups: {
            // `turbopackIgnore`: a path assembled from the environment is otherwise read
            // by the build as "anything on disk", and the whole project — `.env`, a real
            // database in `data/` — is traced into the standalone output.
            directory: path.resolve(
              /* turbopackIgnore: true */ data.BACKUP_DIR?.trim() ||
                path.join(
                  /* turbopackIgnore: true */ path.dirname(data.DATABASE_PATH),
                  "backups",
                ),
            ),
            keep: data.BACKUP_KEEP,
          },
        }
      : {}),
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

/** Which sign-in methods the environment makes possible, whatever is switched on. */
export function configuredMethods(env: Env): MethodSet {
  return { local: env.LOCAL_PASSWORD_HASH !== undefined, oidc: env.oidc !== undefined };
}

/** The methods `AUTH_MODE` switches on, before the settings have been saved. */
export function startingMethods(env: Env): MethodSet {
  return methodsForMode(env.AUTH_MODE);
}

/** Where the provider sends the browser back to. Must be registered with the provider. */
export function oidcRedirectUri(env: Env): string {
  return new URL(CALLBACK_PATH, env.APP_URL).toString();
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
function resolvePasswordHash(
  env: Parsed,
  { required }: { required: boolean },
): string | undefined {
  const fromFile = env.LOCAL_PASSWORD_HASH_FILE
    ? readFileSync(env.LOCAL_PASSWORD_HASH_FILE, "utf8").trim()
    : undefined;
  const raw = fromFile || env.LOCAL_PASSWORD_HASH?.trim();

  if (!raw) {
    if (!required) {
      return undefined;
    }
    throw new Error(
      "Configuration error:\n" +
        `  LOCAL_PASSWORD_HASH is required for AUTH_MODE=${env.AUTH_MODE}.\n` +
        howToMake("hash-password.ts", "auth:hash"),
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
        "  compose file expanded them as variables. Use the base64 form the script prints.\n" +
        howToMake("hash-password.ts", "auth:hash"),
    );
  }

  throw new Error(
    "Configuration error:\n" +
      "  LOCAL_PASSWORD_HASH is neither an argon2id hash nor base64 of one.\n" +
      howToMake("hash-password.ts", "auth:hash"),
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
function resolveTotpSecret(env: Parsed): string | undefined {
  const raw = env.TOTP_SECRET?.trim();
  if (!raw) {
    return undefined;
  }
  if (!isBase32(raw)) {
    throw new Error(
      "Configuration error:\n" +
        "  TOTP_SECRET is not valid base32.\n" +
        howToMake("totp-secret.ts", "auth:totp"),
    );
  }
  return raw;
}

/**
 * Read the identity provider, or nothing when none is configured.
 *
 * Issuer and client id are a pair: one without the other is a half-finished setup, and
 * starting anyway would show a sign-in button that can only fail. Empty values count as
 * unset, because that is what the untouched lines in `.env.example` are.
 */
function resolveOidc(env: Parsed): OidcConfig | undefined {
  const issuer = env.OIDC_ISSUER?.trim();
  const clientId = env.OIDC_CLIENT_ID?.trim();

  if (!issuer && !clientId) {
    return undefined;
  }
  if (!issuer || !clientId) {
    throw new Error(
      "Configuration error:\n" +
        `  ${issuer ? "OIDC_CLIENT_ID" : "OIDC_ISSUER"} is missing.\n` +
        "  An identity provider needs both OIDC_ISSUER and OIDC_CLIENT_ID.",
    );
  }
  if (!URL.canParse(issuer) || !/^https?:$/.test(new URL(issuer).protocol)) {
    throw new Error(
      "Configuration error:\n" +
        `  OIDC_ISSUER is not a URL: ${issuer}\n` +
        "  For Authentik: https://auth.example.com/application/o/<application-slug>/",
    );
  }

  const { emails, invalid } = parseAllowlist(env.OIDC_ALLOWED_EMAILS);
  if (invalid.length > 0) {
    throw new Error(
      "Configuration error:\n" +
        `  OIDC_ALLOWED_EMAILS contains something that is not an e-mail address: ${invalid.join(", ")}`,
    );
  }

  const clientSecret =
    (env.OIDC_CLIENT_SECRET_FILE
      ? readFileSync(env.OIDC_CLIENT_SECRET_FILE, "utf8").trim()
      : undefined) || env.OIDC_CLIENT_SECRET?.trim();
  const providerName = env.OIDC_PROVIDER_NAME?.trim();

  return {
    issuer,
    clientId,
    ...(clientSecret ? { clientSecret } : {}),
    ...(providerName ? { providerName } : {}),
    allowedEmails: emails,
  };
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
