import { NextResponse, type NextRequest } from "next/server";
import {
  readSessionToken,
  shouldRefresh,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/lib/auth/session";

/**
 * The front door.
 *
 * Deny by default: everything that is not explicitly public requires a valid session.
 * Adding a new route therefore cannot accidentally expose household finances — the
 * mistake would be a locked-out page, which is noticed immediately, rather than an open
 * one, which is not.
 *
 * In Next.js 16 this file replaces `middleware.ts` and always runs on the Node.js
 * runtime, so the same session code works here and in server actions.
 */

const PUBLIC_PATHS = ["/login", "/api/health"];

/**
 * Security headers.
 *
 * `frame-ancestors` and `X-Frame-Options` matter most here: the app is one long
 * authenticated form behind a `SameSite=Lax` cookie, and clickjacking is the attack that
 * cookie does not stop.
 *
 * HSTS is only sent over HTTPS. Sending it from a plain-HTTP instance would pin a
 * household to a scheme their reverse proxy may not serve, and there is no way to take
 * it back.
 */
function securityHeaders(isHttps: boolean): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    // Nothing in this app needs a camera, a microphone or a location.
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    ...(isHttps
      ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains" }
      : {}),
  };
}

/**
 * Content-Security-Policy for one request.
 *
 * `script-src` gets a fresh nonce per request; Next.js reads it back out of this header
 * and attaches it to the framework and page scripts itself.
 *
 * `style-src` deliberately does not. Member colours and bar widths are inline `style`
 * attributes, which a nonce does not cover — only `'unsafe-inline'` does, and a nonce in
 * the same directive makes browsers ignore `'unsafe-inline'` entirely. Styles are
 * authored in this repository, never derived from stored data, so the exposure is a
 * style attribute an attacker would already need script execution to inject.
 *
 * Fonts are self-hosted by `next/font`, so no origin outside this one is ever contacted:
 * `default-src 'self'` with `connect-src 'self'` is the whole allowlist.
 */
function contentSecurityPolicy(nonce: string, isHttps: boolean): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // React uses eval in development to rebuild server stacks in the browser.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/**
 * Whether the browser reached this instance over TLS.
 *
 * Behind a reverse proxy that terminates TLS — the documented way to run this — the
 * request arriving here is plain HTTP, so `nextUrl.protocol` alone would mean the
 * session cookie never gets `Secure` and HSTS is never sent on exactly the deployments
 * that need them. `X-Forwarded-Proto` is trusted for this because spoofing it can only
 * make the response stricter, never looser.
 */
function isHttps(request: NextRequest): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }
  return request.nextUrl.protocol === "https:";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const secure = isHttps(request);
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, secure);

  // Next.js reads the nonce back out of the request's CSP header and attaches it to the
  // framework and page scripts itself, so no component has to thread it through.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const harden = <T extends NextResponse>(response: T): T => {
    response.headers.set("Content-Security-Policy", csp);
    for (const [key, value] of Object.entries(securityHeaders(secure))) {
      response.headers.set(key, value);
    }
    return response;
  };

  const secret = process.env.SESSION_SECRET ?? "";
  const session = await readSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    secret,
  );

  if (session && pathname === "/login") {
    return harden(NextResponse.redirect(new URL("/", request.url)));
  }

  if (isPublic) {
    return harden(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  if (!session) {
    const target = new URL("/login", request.url);
    // Remember where they were headed, so signing in continues the journey.
    if (pathname !== "/") {
      target.searchParams.set("weiter", pathname);
    }
    return harden(NextResponse.redirect(target));
  }

  const response = harden(NextResponse.next({ request: { headers: requestHeaders } }));

  if (shouldRefresh(session)) {
    const token = await createSessionToken(
      {
        subject: session.subject,
        method: session.method,
        ...(session.name ? { name: session.name } : {}),
        ...(session.email ? { email: session.email } : {}),
      },
      secret,
    );
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
  }

  return response;
}

export const config = {
  // Everything except Next's own assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
