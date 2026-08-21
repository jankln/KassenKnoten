import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getEnv, isSecureOrigin, resetEnvCache } from "./env";

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

  it("rejects an auth mode that has no implementation yet", () => {
    configure({ AUTH_MODE: "oidc" });
    expect(() => getEnv()).toThrow();
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
