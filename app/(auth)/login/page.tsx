import type { Metadata } from "next";
import { KnotMark } from "@/components/brand/knot-mark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Anmelden",
};

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="ruled pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative w-full max-w-sm">
        <KnotMark className="mb-8 h-16 w-16" animate />

        <h1 className="font-display text-4xl font-semibold tracking-tight">
          KassenKnoten
        </h1>
        <p className="text-ink-muted mt-2.5 text-sm leading-relaxed">
          Der Haushaltsplan ist mit einem Passwort geschützt.
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
