import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import {
  authorizationUrl,
  discover,
  discoveryUrl,
  exchangeCode,
  openTransaction,
  pkceChallenge,
  sealTransaction,
  TRANSACTION_TTL_SECONDS,
  verifyIdToken,
  withUserinfo,
  type Discovery,
} from "./oidc";

const ISSUER = "https://auth.example.com/application/o/kassenknoten/";
const CLIENT_ID = "kassenknoten";
const SECRET = "a-secret-that-is-definitely-long-enough";

const DISCOVERY: Discovery = {
  issuer: ISSUER,
  authorization_endpoint: "https://auth.example.com/application/o/authorize/",
  token_endpoint: "https://auth.example.com/application/o/token/",
  jwks_uri: "https://auth.example.com/application/o/kassenknoten/jwks/",
};

function jsonFetch(status: number, body: unknown, seen?: Request[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen?.push(new Request(input, init));
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

describe("pkceChallenge", () => {
  it("matches the S256 example in RFC 7636 appendix B", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
  });
});

describe("discovery", () => {
  it("does not double the slash of an Authentik issuer", () => {
    expect(discoveryUrl(ISSUER)).toBe(
      "https://auth.example.com/application/o/kassenknoten/.well-known/openid-configuration",
    );
  });

  it("returns the endpoints of a well-formed document", async () => {
    await expect(discover(ISSUER, jsonFetch(200, DISCOVERY))).resolves.toEqual(
      DISCOVERY,
    );
  });

  it("names a trailing-slash mismatch instead of failing every token later", async () => {
    await expect(
      discover(ISSUER.replace(/\/$/, ""), jsonFetch(200, DISCOVERY)),
    ).rejects.toThrow(/must match exactly, trailing slash included/);
  });

  it("refuses a document that is not OIDC", async () => {
    await expect(discover(ISSUER, jsonFetch(200, { issuer: ISSUER }))).rejects.toThrow(
      /no authorization_endpoint/,
    );
    await expect(discover(ISSUER, jsonFetch(404, {}))).rejects.toThrow(/HTTP 404/);
  });
});

describe("authorizationUrl", () => {
  it("asks for a code with PKCE, state and nonce", () => {
    const url = authorizationUrl({
      discovery: DISCOVERY,
      clientId: CLIENT_ID,
      redirectUri: "https://kassen.example.com/login/oidc/callback",
      state: "the-state",
      nonce: "the-nonce",
      verifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    });
    expect(url.origin + url.pathname).toBe(DISCOVERY.authorization_endpoint);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: "https://kassen.example.com/login/oidc/callback",
      scope: "openid email profile",
      state: "the-state",
      nonce: "the-nonce",
      code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
      code_challenge_method: "S256",
    });
  });
});

describe("transaction cookie", () => {
  const transaction = {
    state: "s",
    nonce: "n",
    verifier: "v",
    returnTo: "/sparen",
  };
  const now = new Date("2026-09-14T10:00:00Z");

  it("round-trips", async () => {
    const token = await sealTransaction(transaction, SECRET, now);
    await expect(openTransaction(token, SECRET, now)).resolves.toEqual(transaction);
  });

  it("expires, and does not open under another secret", async () => {
    const token = await sealTransaction(transaction, SECRET, now);
    const later = new Date(now.getTime() + (TRANSACTION_TTL_SECONDS + 1) * 1000);
    await expect(openTransaction(token, SECRET, later)).resolves.toBeNull();
    await expect(
      openTransaction(token, "another-secret-that-is-long-enough!!", now),
    ).resolves.toBeNull();
    await expect(openTransaction(undefined, SECRET, now)).resolves.toBeNull();
  });
});

describe("exchangeCode", () => {
  const base = {
    discovery: DISCOVERY,
    clientId: CLIENT_ID,
    code: "the-code",
    verifier: "the-verifier",
    redirectUri: "https://kassen.example.com/login/oidc/callback",
  };

  it("authenticates a confidential client with HTTP Basic and sends the verifier", async () => {
    const seen: Request[] = [];
    const tokens = await exchangeCode({
      ...base,
      clientSecret: "s3cr:t",
      fetchImpl: jsonFetch(200, { id_token: "the.id.token", access_token: "at" }, seen),
    });
    expect(tokens).toEqual({ idToken: "the.id.token", accessToken: "at" });
    const request = seen[0]!;
    expect(request.headers.get("authorization")).toBe(
      `Basic ${Buffer.from("kassenknoten:s3cr%3At").toString("base64")}`,
    );
    const body = new URLSearchParams(await request.text());
    expect(body.get("code_verifier")).toBe("the-verifier");
    expect(body.get("client_id")).toBeNull();
  });

  it("sends the client id in the body for a public client", async () => {
    const seen: Request[] = [];
    await exchangeCode({ ...base, fetchImpl: jsonFetch(200, { id_token: "x" }, seen) });
    const body = new URLSearchParams(await seen[0]!.text());
    expect(body.get("client_id")).toBe(CLIENT_ID);
    expect(seen[0]!.headers.get("authorization")).toBeNull();
  });

  it("reports the provider's error", async () => {
    await expect(
      exchangeCode({ ...base, fetchImpl: jsonFetch(400, { error: "invalid_grant" }) }),
    ).rejects.toThrow(/invalid_grant/);
  });
});

describe("verifyIdToken", () => {
  let privateKey: CryptoKey;
  let keys: ReturnType<typeof createLocalJWKSet>;
  let strangerKey: CryptoKey;
  const now = new Date("2026-09-14T10:00:00Z");
  const iat = Math.floor(now.getTime() / 1000);

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    privateKey = pair.privateKey;
    const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" };
    keys = createLocalJWKSet({ keys: [jwk] });
    strangerKey = (await generateKeyPair("RS256")).privateKey;
  });

  function token(
    claims: Record<string, unknown>,
    options: { key?: CryptoKey; issuer?: string; audience?: string | string[] } = {},
  ) {
    return new SignJWT({ nonce: "the-nonce", ...claims })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setSubject("user-1")
      .setIssuer(options.issuer ?? ISSUER)
      .setAudience(options.audience ?? CLIENT_ID)
      .setIssuedAt(iat)
      .setExpirationTime(iat + 300)
      .sign(options.key ?? privateKey);
  }

  const verify = async (idToken: string, nonce = "the-nonce") =>
    verifyIdToken({ idToken, issuer: ISSUER, clientId: CLIENT_ID, nonce, keys, now });

  it("returns the identity from a valid token", async () => {
    const idToken = await token({
      email: "alex@example.com",
      email_verified: true,
      preferred_username: "alex",
    });
    await expect(verify(idToken)).resolves.toEqual({
      subject: "user-1",
      email: "alex@example.com",
      emailVerified: true,
      name: "alex",
    });
  });

  it("refuses a token signed by another key", async () => {
    await expect(verify(await token({}, { key: strangerKey }))).rejects.toThrow(
      /did not verify/,
    );
  });

  it("refuses another issuer and another audience", async () => {
    await expect(
      verify(
        await token({}, { issuer: "https://auth.example.com/application/o/other/" }),
      ),
    ).rejects.toThrow(/did not verify/);
    await expect(verify(await token({}, { audience: "other-app" }))).rejects.toThrow(
      /did not verify/,
    );
  });

  it("refuses a nonce from another sign-in", async () => {
    await expect(verify(await token({}), "another-nonce")).rejects.toThrow(/nonce/);
  });

  it("refuses an expired token", async () => {
    const idToken = await token({});
    await expect(
      verifyIdToken({
        idToken,
        issuer: ISSUER,
        clientId: CLIENT_ID,
        nonce: "the-nonce",
        keys,
        now: new Date(now.getTime() + 3600_000),
      }),
    ).rejects.toThrow(/did not verify/);
  });

  it("requires azp to name this client when the audience has several", async () => {
    const idToken = await token(
      { azp: "other-app" },
      { audience: [CLIENT_ID, "other-app"] },
    );
    await expect(verify(idToken)).rejects.toThrow(/another party/);
  });
});

describe("withUserinfo", () => {
  const discovery = {
    ...DISCOVERY,
    userinfo_endpoint: "https://auth.example.com/userinfo/",
  };
  const bare = { subject: "user-1" };

  it("fills in the profile when the ID token carries none", async () => {
    const seen: Request[] = [];
    const identity = await withUserinfo({
      identity: bare,
      discovery,
      accessToken: "at",
      fetchImpl: jsonFetch(
        200,
        {
          sub: "user-1",
          email: "alex@example.com",
          email_verified: false,
          name: "Alex",
        },
        seen,
      ),
    });
    expect(identity).toEqual({
      subject: "user-1",
      email: "alex@example.com",
      emailVerified: false,
      name: "Alex",
    });
    expect(seen[0]!.headers.get("authorization")).toBe("Bearer at");
  });

  it("refuses a userinfo answer about somebody else", async () => {
    await expect(
      withUserinfo({
        identity: bare,
        discovery,
        accessToken: "at",
        fetchImpl: jsonFetch(200, { sub: "user-2", email: "robin@example.com" }),
      }),
    ).rejects.toThrow(/another subject/);
  });

  it("does not ask when the ID token already has the address", async () => {
    const identity = { subject: "user-1", email: "alex@example.com" };
    const refuse = (() => {
      throw new Error("must not be called");
    }) as unknown as typeof fetch;
    await expect(
      withUserinfo({ identity, discovery, accessToken: "at", fetchImpl: refuse }),
    ).resolves.toBe(identity);
  });
});
