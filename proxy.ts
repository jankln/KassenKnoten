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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  const secret = process.env.SESSION_SECRET ?? "";
  const session = await readSessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    secret,
  );

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublic) {
    return NextResponse.next();
  }

  if (!session) {
    const target = new URL("/login", request.url);
    // Remember where they were headed, so signing in continues the journey.
    if (pathname !== "/") {
      target.searchParams.set("weiter", pathname);
    }
    return NextResponse.redirect(target);
  }

  const response = NextResponse.next();

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
      secure: request.nextUrl.protocol === "https:",
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
