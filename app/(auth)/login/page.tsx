import type { Metadata } from "next";
import { connection } from "next/server";
import { KnotMark } from "@/components/brand/knot-mark";
import { getEnv, requiresSecondFactor } from "@/lib/env";
import { de } from "@/lib/i18n/de";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden",
};

export default async function LoginPage() {
  // Every other route reads cookies and is dynamic already; this one is not, and a
  // prerendered login screen cannot carry the per-request CSP nonce that `proxy.ts`
  // issues. Its scripts would be blocked and the form would never become interactive.
  // A login page has nothing worth caching anyway.
  await connection();

  // Whether a second factor is configured — never the secret itself. The form only needs
  // to know that a field belongs on screen.
  const requiresCode = requiresSecondFactor(getEnv());

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="ruled pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        <KnotMark className="mb-8 h-16 w-16" animate />

        <h1 className="font-display text-4xl font-semibold tracking-tight">
          KassenKnoten
        </h1>
        <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">
          {requiresCode ? de.login.introWithCode : de.login.intro}
        </p>

        <LoginForm requiresCode={requiresCode} />
      </div>
    </main>
  );
}
