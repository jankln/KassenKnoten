import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { completeOidcSignIn } from "@/lib/auth/oidc-flow";

/** Where the identity provider sends the browser back. Registered as the redirect URI. */
export async function GET(request: NextRequest) {
  redirect(await completeOidcSignIn(request.nextUrl.searchParams));
}
