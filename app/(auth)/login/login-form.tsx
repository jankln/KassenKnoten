"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type LoginState } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <form action={formAction} className="mt-9 space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          Haushalts-Passwort
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
          className="border-line bg-surface rounded-control placeholder:text-ink-muted/60 focus-visible:border-brass h-12 w-full border px-3.5 text-base transition-colors outline-none"
        />
      </div>

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
      {pending ? "Wird geprüft …" : "Anmelden"}
    </button>
  );
}
