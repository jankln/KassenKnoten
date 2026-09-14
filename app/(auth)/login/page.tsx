import type { Metadata } from "next";
import { connection } from "next/server";
import { KnotMark } from "@/components/brand/knot-mark";
import { getEnv, requiresSecondFactor } from "@/lib/env";
import type { OidcSignInError } from "@/lib/auth/oidc-flow";
import { LoginForm } from "./login-form";
import { getMessages } from "@/server/i18n";
import { getSignInState } from "@/server/services/sign-in";

const ERRORS = [
  "disabled",
  "provider",
  "expired",
  "unverified",
  "denied",
  "ended",
] as const;
type LoginError = OidcSignInError | "ended";

function isLoginError(value: unknown): value is LoginError {
  return ERRORS.includes(value as LoginError);
}

// A page title is copy like any other, so it is resolved per request rather than
// frozen into a module constant at import time.
export function generateMetadata(): Metadata {
  return { title: getMessages().login.title };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = getMessages();
  // Every other route reads cookies and is dynamic already; this one is not, and a
  // prerendered login screen cannot carry the per-request CSP nonce that `proxy.ts`
  // issues. Its scripts would be blocked and the form would never become interactive.
  // A login page has nothing worth caching anyway.
  await connection();

  const env = getEnv();
  const { effective } = getSignInState(env);
  // Whether a second factor is configured — never the secret itself. The form only needs
  // to know that a field belongs on screen.
  const requiresCode = effective.local && requiresSecondFactor(env);
  const provider = env.oidc?.providerName ?? t.login.providerFallback;

  const params = await searchParams;
  const error = isLoginError(params.fehler) ? t.login.errors[params.fehler] : undefined;
  // Carried through the password form and the provider round trip, so signing in
  // continues where the proxy stopped somebody. Checked again on the way back; this is
  // only passed along.
  const returnTo = typeof params.weiter === "string" ? params.weiter : undefined;
  const providerHref = returnTo
    ? `/login/oidc?${new URLSearchParams({ weiter: returnTo })}`
    : "/login/oidc";

  const intro = !effective.local
    ? t.login.introProvider(provider)
    : effective.oidc
      ? t.login.introBoth(provider)
      : requiresCode
        ? t.login.introWithCode
        : t.login.intro;

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="ruled pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        <KnotMark className="mb-8 h-16 w-16" animate />

        <h1 className="font-display text-4xl font-semibold tracking-tight">
          KassenKnoten
        </h1>
        <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">{intro}</p>

        {error ? (
          <p role="alert" className="text-negative mt-6 text-sm">
            {error}
          </p>
        ) : null}

        {effective.oidc ? (
          // A plain link rather than <Link>: it leaves the app for another origin, and
          // prefetching the start of a sign-in would set a transaction cookie for nothing.
          <a
            href={providerHref}
            className="bg-brass text-brass-ink rounded-control mt-9 flex h-12 w-full items-center justify-center px-4 text-center text-sm font-semibold tracking-wide transition-[opacity,transform] hover:opacity-90 active:scale-[0.99]"
          >
            {t.login.withProvider(provider)}
          </a>
        ) : null}

        {effective.oidc && effective.local ? (
          <div className="text-ink-muted mt-8 flex items-center gap-3 text-xs tracking-wide uppercase">
            <span className="bg-line h-px flex-1" aria-hidden="true" />
            {t.login.or}
            <span className="bg-line h-px flex-1" aria-hidden="true" />
          </div>
        ) : null}

        {effective.local ? (
          <LoginForm
            requiresCode={requiresCode}
            secondary={effective.oidc}
            {...(returnTo ? { returnTo } : {})}
          />
        ) : null}
      </div>
    </main>
  );
}
