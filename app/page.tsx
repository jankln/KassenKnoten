export default function Page() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="bg-brand text-brand-ink flex size-10 items-center justify-center rounded-xl text-lg font-semibold">
          K
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">KassenKnoten</h1>
      </div>
      <p className="text-ink-muted text-balance">
        Der Haushaltsplan wird gerade aufgebaut. Einnahmen, Fixkosten und Rücklagen
        ziehen hier bald ein.
      </p>
      <p className="text-ink-muted text-sm">
        Nächster Schritt laut Plan: Datenbank und Rechenkern.
      </p>
    </main>
  );
}
