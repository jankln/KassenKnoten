import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { beginOidcSignIn } from "@/lib/auth/oidc-flow";

/** Leave for the identity provider. A link, not a form: there is nothing to submit. */
export async function GET(request: NextRequest) {
  redirect(await beginOidcSignIn(request.nextUrl.searchParams.get("weiter")));
}
