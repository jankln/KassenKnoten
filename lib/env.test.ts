import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configuredMethods,
  getEnv,
  isSecureOrigin,
  oidcRedirectUri,
  requiresSecondFactor,
  resetEnvCache,
  startingMethods,
} from "./env";

const VALID_HASH = "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$aGFzaGhhc2g";
const original = { ...process.env };

beforeEach(() => {
  resetEnvCache();
  process.env = { ...original };
});

afterEach(() => {
  process.env = original;
  resetEnvCache();
});

function configure(overrides: Record<string, string | undefined>) {
  process.env = {
    SESSION_SECRET: "a-secret-that-is-definitely-long-enough",
    LOCAL_PASSWORD_HASH: VALID_HASH,
    ...overrides,
  } as unknown as NodeJS.ProcessEnv;
}

describe("getEnv", () => {
  it("fills in defaults for an otherwise minimal configuration", () => {
    configure({});
    const env = getEnv();
    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(env.DATABASE_PATH).toBe("./data/kassenknoten.db");
    expect(env.AUTH_MODE).toBe("local");
  });

  it("refuses to start without a session secret", () => {
    configure({ SESSION_SECRET: undefined });
    expect(() => getEnv()).toThrow(/SESSION_SECRET/);
  });

  it("refuses a session secret that is too short to be worth having", () => {
    configure({ SESSION_SECRET: "short" });
    expect(() => getEnv()).toThrow(/at least 32 characters/);
  });

  it("refuses to start without a password hash, rather than letting everyone in", () => {
    configure({ LOCAL_PASSWORD_HASH: undefined });
    expect(() => getEnv()).toThrow(/LOCAL_PASSWORD_HASH is required/);
  });

  it("rejects a password hash that is not argon2id", () => {
    configure({ LOCAL_PASSWORD_HASH: "$2b$10$notargon" });
    expect(() => getEnv()).toThrow(/argon2id/);
  });

  it("accepts the hash base64-encoded, so a .env parser cannot mangle it", () => {
    configure({
      LOCAL_PASSWORD_HASH: Buffer.from(VALID_HASH, "utf8").toString("base64"),
    });
    expect(getEnv().LOCAL_PASSWORD_HASH).toBe(VALID_HASH);
  });

  it("names the real problem when the $ signs were expanded away", () => {
    // What .env and docker-compose actually turn "$argon2id$v=19$m=19456,..." into.
    configure({ LOCAL_PASSWORD_HASH: "=19=19456,t=2,p=1" });
    expect(() => getEnv()).toThrow(/lost its \$ characters/);
  });

  it("reads the hash from a file, for Docker secrets", () => {
    const file = join(mkdtempSync(join(tmpdir(), "kk-env-")), "hash");
    writeFileSync(file, `${VALID_HASH}\n`);
    configure({ LOCAL_PASSWORD_HASH: undefined, LOCAL_PASSWORD_HASH_FILE: file });
    expect(getEnv().LOCAL_PASSWORD_HASH).toBe(VALID_HASH);
  });

  it("rejects an auth mode it does not know", () => {
    configure({ AUTH_MODE: "ldap" });
    expect(() => getEnv()).toThrow(/AUTH_MODE must be "local", "oidc" or "both"/);
  });

  it("rejects an APP_URL that is not a URL", () => {
    configure({ APP_URL: "kassenknoten" });
    expect(() => getEnv()).toThrow(/APP_URL/);
  });
});

describe("isSecureOrigin", () => {
  it("is true only when the app is served over TLS", () => {
    configure({ APP_URL: "https://kassen.example.com" });
    expect(isSecureOrigin(getEnv())).toBe(true);

    resetEnvCache();
    configure({ APP_URL: "http://localhost:3000" });
    expect(isSecureOrigin(getEnv())).toBe(false);
  });
});

describe("second factor", () => {
  const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

  it("is off when TOTP_SECRET is absent", () => {
    configure({});
    const env = getEnv();
    expect(env.TOTP_SECRET).toBeUndefined();
    expect(requiresSecondFactor(env)).toBe(false);
  });

  /**
   * The line is in `.env.example` and ships untouched in most `.env` files. Left as
   * present-but-empty it would make the login screen ask for a code that the sign-in
   * action does not verify — a form that claims a protection nothing enforces.
   */
  it("is off when TOTP_SECRET is present but empty", () => {
    configure({ TOTP_SECRET: "" });
    expect(requiresSecondFactor(getEnv())).toBe(false);

    resetEnvCache();
    configure({ TOTP_SECRET: "   " });
    expect(requiresSecondFactor(getEnv())).toBe(false);
  });

  it("is on for a readable base32 secret", () => {
    configure({ TOTP_SECRET: SECRET });
    const env = getEnv();
    expect(env.TOTP_SECRET).toBe(SECRET);
    expect(requiresSecondFactor(env)).toBe(true);
  });

  it("tolerates the whitespace around a pasted secret", () => {
    configure({ TOTP_SECRET: `  ${SECRET}  ` });
    expect(getEnv().TOTP_SECRET).toBe(SECRET);
  });

  /** Refused at startup, not at the login screen: silently dropping the second factor
   *  from an instance whose owner believes it is protected is the worst outcome here. */
  it("refuses to start on a secret that is not base32", () => {
    configure({ TOTP_SECRET: "nicht base32!" });
    expect(() => getEnv()).toThrow(/TOTP_SECRET is not valid base32/);
  });
});

describe("identity provider", () => {
  const ISSUER = "https://auth.example.com/application/o/kassenknoten/";
  const provider = {
    OIDC_ISSUER: ISSUER,
    OIDC_CLIENT_ID: "kassenknoten",
    OIDC_CLIENT_SECRET: "client-secret",
    OIDC_ALLOWED_EMAILS: "Alex@example.com, robin@example.com",
  };

  it("is absent, and changes nothing, when the variables are unset or empty", () => {
    configure({ OIDC_ISSUER: "", OIDC_CLIENT_ID: "", OIDC_CLIENT_SECRET: "" });
    const env = getEnv();
    expect(env.oidc).toBeUndefined();
    expect(configuredMethods(env)).toEqual({ local: true, oidc: false });
    expect(startingMethods(env)).toEqual({ local: true, oidc: false });
  });

  it("is configured but not switched on under AUTH_MODE=local", () => {
    configure(provider);
    const env = getEnv();
    expect(env.oidc).toEqual({
      issuer: ISSUER,
      clientId: "kassenknoten",
      clientSecret: "client-secret",
      allowedEmails: ["alex@example.com", "robin@example.com"],
    });
    expect(configuredMethods(env)).toEqual({ local: true, oidc: true });
    expect(startingMethods(env)).toEqual({ local: true, oidc: false });
  });

  it("starts with both under AUTH_MODE=both", () => {
    configure({ ...provider, AUTH_MODE: "both" });
    expect(startingMethods(getEnv())).toEqual({ local: true, oidc: true });
  });

  it("needs no password hash under AUTH_MODE=oidc", () => {
    configure({ ...provider, AUTH_MODE: "oidc", LOCAL_PASSWORD_HASH: undefined });
    const env = getEnv();
    expect(env.LOCAL_PASSWORD_HASH).toBeUndefined();
    expect(configuredMethods(env)).toEqual({ local: false, oidc: true });
  });

  it("still requires the password hash under AUTH_MODE=both", () => {
    configure({ ...provider, AUTH_MODE: "both", LOCAL_PASSWORD_HASH: undefined });
    expect(() => getEnv()).toThrow(
      /LOCAL_PASSWORD_HASH is required for AUTH_MODE=both/,
    );
  });

  it("refuses AUTH_MODE=oidc or both without a provider", () => {
    configure({ AUTH_MODE: "oidc" });
    expect(() => getEnv()).toThrow(/AUTH_MODE=oidc needs an identity provider/);
  });

  it("refuses provider-only with nobody on the allowlist", () => {
    configure({ ...provider, AUTH_MODE: "oidc", OIDC_ALLOWED_EMAILS: "" });
    expect(() => getEnv()).toThrow(/at least one address in OIDC_ALLOWED_EMAILS/);
  });

  it("refuses half a provider", () => {
    configure({ OIDC_ISSUER: ISSUER });
    expect(() => getEnv()).toThrow(/OIDC_CLIENT_ID is missing/);
  });

  it("refuses an issuer that is not a URL, and an allowlist entry that is not an address", () => {
    configure({ ...provider, OIDC_ISSUER: "auth.example.com" });
    expect(() => getEnv()).toThrow(/OIDC_ISSUER is not a URL/);

    resetEnvCache();
    configure({ ...provider, OIDC_ALLOWED_EMAILS: "alex@example.com, robin" });
    expect(() => getEnv()).toThrow(/not an e-mail address: robin/);
  });

  it("reads the client secret from a file, for Docker secrets", () => {
    const file = join(mkdtempSync(join(tmpdir(), "kk-env-")), "client-secret");
    writeFileSync(file, "from-a-file\n");
    configure({
      ...provider,
      OIDC_CLIENT_SECRET: undefined,
      OIDC_CLIENT_SECRET_FILE: file,
    });
    expect(getEnv().oidc?.clientSecret).toBe("from-a-file");
  });

  it("builds the redirect URI from APP_URL", () => {
    configure({ ...provider, APP_URL: "https://kassen.example.com" });
    expect(oidcRedirectUri(getEnv())).toBe(
      "https://kassen.example.com/login/oidc/callback",
    );
  });
});

describe("automatic backups", () => {
  it("are on by default, beside the database, keeping fourteen", () => {
    configure({ DATABASE_PATH: "/data/kassenknoten.db" });
    expect(getEnv().backups).toEqual({ directory: "/data/backups", keep: 14 });
  });

  it("treat the untouched lines in .env.example as the defaults", () => {
    configure({
      DATABASE_PATH: "/data/kassenknoten.db",
      BACKUP_DIR: "",
      BACKUP_KEEP: "",
    });
    expect(getEnv().backups).toEqual({ directory: "/data/backups", keep: 14 });
  });

  it("take a directory and a count", () => {
    configure({ BACKUP_DIR: "/mnt/nas/kassenknoten", BACKUP_KEEP: "30" });
    expect(getEnv().backups).toEqual({ directory: "/mnt/nas/kassenknoten", keep: 30 });
  });

  it("are off with BACKUP_KEEP=0", () => {
    configure({ BACKUP_KEEP: "0" });
    expect(getEnv().backups).toBeUndefined();
  });

  it("refuse a count that is not a whole number", () => {
    for (const value of ["-1", "2.5", "many"]) {
      resetEnvCache();
      configure({ BACKUP_KEEP: value });
      expect(() => getEnv()).toThrow(/BACKUP_KEEP must be a whole number/);
    }
  });
});
