import { redirect } from "next/navigation";
import { endSession } from "@/lib/auth/current-session";

/**
 * Clear a session that still decrypts but is no longer allowed in — its method was
 * switched off, or its address left the allowlist.
 *
 * A server component cannot delete a cookie, and sending such a session straight to
 * `/login` would loop: the proxy sees a valid cookie there and sends it back to `/`.
 */
export async function GET() {
  await endSession();
  redirect("/login?fehler=ended");
}
