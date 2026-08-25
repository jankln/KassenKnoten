"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type LoginState } from "@/lib/auth/actions";
import { de } from "@/lib/i18n/de";

const field =
  "border-line bg-surface rounded-control placeholder:text-ink-muted/60 focus-visible:border-brass h-12 w-full border px-3.5 text-base transition-colors outline-none";

export function LoginForm({ requiresCode }: { requiresCode: boolean }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signIn, {});
  const copy = de.login;

  return (
    <form action={formAction} className="mt-9 space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          {copy.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-describedby={state.error ? "login-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          className={field}
        />
      </div>

      {requiresCode ? (
        <div className="space-y-2">
          <label htmlFor="code" className="block text-sm font-medium">
            {copy.code}
          </label>
          <input
            id="code"
            name="code"
            type="text"
            // `one-time-code` is what makes iOS and Android offer the code from the
            // clipboard or a notification instead of making someone retype it.
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            placeholder="000000"
            aria-describedby={state.error ? "login-error code-hint" : "code-hint"}
            aria-invalid={state.error ? true : undefined}
            // Tabular figures and the ledger face, like every other number in this app —
            // and wide tracking, because six digits are read in groups, not as a word.
            className={`${field} font-ledger tabular text-center text-lg tracking-[0.35em]`}
          />
          <p id="code-hint" className="text-ink-muted text-xs">
            {copy.codeHint}
          </p>
        </div>
      ) : null}

      {state.error ? (
        <p id="login-error" role="alert" className="text-negative text-sm">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brass text-brass-ink rounded-control h-12 w-full text-sm font-semibold tracking-wide transition-[opacity,transform] hover:opacity-90 active:scale-[0.99] disabled:opacity-70"
    >
      {pending ? de.login.pending : de.login.submit}
    </button>
  );
}
