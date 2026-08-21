import { signOut } from "@/lib/auth/actions";

export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Angemeldet</h1>
      <p className="text-ink-muted text-balance">
        Der Haushaltsplan wird gerade aufgebaut. Einnahmen, Fixkosten und Rücklagen
        ziehen hier bald ein.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="border-line rounded-control hover:bg-surface-muted h-10 border px-4 text-sm font-medium transition-colors"
        >
          Abmelden
        </button>
      </form>
    </main>
  );
}
