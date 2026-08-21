/**
 * Every user-facing string in the app.
 *
 * The interface is German; the code is English. Keeping the copy in one file is what
 * makes that workable: the whole voice of the product can be read and reviewed in one
 * sitting, and a heading cannot quietly drift out of step with the button below it.
 *
 * A German string hardcoded in a component is a bug.
 */
export const de = {
  app: {
    name: "KassenKnoten",
    tagline: "Haushaltsfinanzen planen",
  },

  nav: {
    overview: "Übersicht",
    household: "Haushalt",
    fixedCosts: "Fixkosten",
    savings: "Sparen",
    settings: "Einstellungen",
    menu: "Navigation",
  },

  actions: {
    add: "Hinzufügen",
    save: "Speichern",
    cancel: "Abbrechen",
    edit: "Bearbeiten",
    delete: "Löschen",
    undo: "Rückgängig",
    signOut: "Abmelden",
    saved: "Gespeichert.",
    back: "Zurück",
  },

  theme: {
    label: "Darstellung",
    light: "Hell",
    dark: "Dunkel",
    system: "System",
  },

  sections: {
    overview: {
      title: "Übersicht",
      subtitle: "Der laufende Monat auf einen Blick.",
      empty: {
        title: "Noch nichts zu rechnen",
        body: "Sobald Personen, Einnahmen und Fixkosten eingetragen sind, steht hier der Monat.",
        action: "Haushalt einrichten",
      },
    },
    household: {
      title: "Haushalt",
      subtitle: "Wer gehört dazu und wer verdient was.",
      empty: {
        title: "Noch niemand angelegt",
        body: "Trage die Personen ein, die zum Haushalt gehören. Einnahmen kommen direkt danach dazu.",
        action: "Person hinzufügen",
      },
      total: "Einnahmen gesamt",
      addMember: "Person hinzufügen",
      editMember: "Person bearbeiten",
      newMember: "Neue Person",
      memberName: "Name",
      memberNamePlaceholder: "z. B. Alex",
      color: "Farbe",
      colorHint: "Diese Farbe steht überall für die Person.",
      removeMember: "Person entfernen",
      memberRemoved: (name: string) => `${name} entfernt.`,
      noIncome: "Noch keine Einnahmen",
      addIncome: "Einnahme hinzufügen",
      editIncome: "Einnahme bearbeiten",
      newIncome: "Neue Einnahme",
      incomeLabel: "Bezeichnung",
      incomeLabelPlaceholder: "z. B. Gehalt",
      incomeKind: "Art",
      incomeKindSalary: "Gehalt",
      incomeKindOther: "Sonstiges",
      amount: "Betrag",
      interval: "Rhythmus",
      removeIncome: "Einnahme entfernen",
      incomeRemoved: "Einnahme entfernt.",
    },
    fixedCosts: {
      title: "Fixkosten",
      subtitle: "Was jeden Monat sicher abgeht — privat und gemeinsam.",
      private: "Privat",
      shared: "Gemeinsam",
      empty: {
        title: "Noch keine Fixkosten",
        body: "Miete, Strom, Abos: alles, was regelmäßig abgebucht wird, gehört hierher.",
        action: "Fixkosten hinzufügen",
      },
      noMembers: {
        title: "Erst die Personen",
        body: "Fixkosten gehören immer zu jemandem. Lege zuerst die Personen im Haushalt an.",
        action: "Zum Haushalt",
      },
      noneForMember: "Noch keine Fixkosten",
      addExpense: "Fixkosten hinzufügen",
      addShort: "Hinzufügen",
      editExpense: "Fixkosten bearbeiten",
      newExpense: "Neue Fixkosten",
      expenseLabel: "Bezeichnung",
      expenseLabelPlaceholder: "z. B. Sportverein",
      category: "Kategorie",
      noCategory: "Ohne Kategorie",
      person: "Person",
      removeExpense: "Fixkosten entfernen",
      expenseRemoved: "Eintrag entfernt.",
      privateTotal: "Private Fixkosten gesamt",
      sharedTotal: "Gemeinsame Fixkosten gesamt",
      grandTotal: "Fixkosten gesamt",
      addShared: "Gemeinsame Kosten hinzufügen",
      newShared: "Neue gemeinsame Kosten",
      editShared: "Gemeinsame Kosten bearbeiten",
      sharedEmpty: {
        title: "Noch keine gemeinsamen Kosten",
        body: "Miete, Strom, Internet: alles, was ihr zusammen tragt. Bei jedem Posten legst du fest, wie geteilt wird.",
        action: "Gemeinsame Kosten hinzufügen",
      },
      split: "Aufteilung",
      splitFixed: "Feste Quote",
      splitIncome: "Nach Einkommen",
      splitIncomeHint: "Wird laufend aus den Einkommen berechnet.",
      splitNoIncomeHint: "Ohne Einkommen wird gleichmäßig geteilt.",
      splitPreview: "So wird geteilt",
      defaultSplit: "Standard-Aufteilung",
      defaultSplitHint:
        "Vorbelegung für neue gemeinsame Kosten. Bestehende Posten bleiben, wie sie sind.",
    },
    savings: {
      title: "Sparen",
      subtitle: "Spartöpfe, Raten und Rücklagen.",
      empty: {
        title: "Noch keine Spartöpfe",
        body: "Notgroschen, Urlaub, ETF: leg einen Topf an und trage die monatliche Rate ein.",
        action: "Spartopf anlegen",
      },
    },
    settings: {
      title: "Einstellungen",
      subtitle: "Aufteilung, Kategorien und Daten.",
      themeHint: "Gilt nur auf diesem Gerät.",
      categories: "Kategorien",
      categoriesHint: "Womit Fixkosten sortiert werden.",
      addCategory: "Kategorie hinzufügen",
      editCategory: "Kategorie bearbeiten",
      newCategory: "Neue Kategorie",
      categoryName: "Name",
      categoryNamePlaceholder: "z. B. Haustier",
      categoryIcon: "Symbol",
      removeCategory: "Kategorie entfernen",
      categoryRemoved: (name: string) => `${name} entfernt.`,
      systemCategoryHint:
        "Voreingestellte Kategorien lassen sich umbenennen, aber nicht entfernen.",
    },
  },

  /** Labels for a recurrence expressed in months. */
  intervals: {
    1: "monatlich",
    3: "vierteljährlich",
    6: "halbjährlich",
    12: "jährlich",
    /** Anything else, e.g. every four months. */
    other: (months: number) => `alle ${months} Monate`,
  },

  units: {
    perMonth: "pro Monat",
    perMonthShort: "/ Monat",
    perYear: "pro Jahr",
  },

  validation: {
    nameRequired: "Bitte einen Namen eingeben.",
    nameTooLong: "Der Name ist zu lang.",
    labelRequired: "Bitte eine Bezeichnung eingeben.",
    labelTooLong: "Die Bezeichnung ist zu lang.",
    amountInvalid: "Das ist kein gültiger Betrag.",
    amountNegative: "Der Betrag darf nicht negativ sein.",
    amountTooLarge: "Der Betrag ist zu groß.",
    iconInvalid: "Bitte ein Symbol auswählen.",
    nameTaken: "Diesen Namen gibt es schon.",
    splitModeRequired: "Bitte auswählen, wie geteilt wird.",
    sharesMustSum: "Die Anteile müssen zusammen 100 % ergeben.",
    failed: "Das hat nicht geklappt. Bitte noch einmal versuchen.",
  },

  underConstruction: {
    title: "Wird gerade gebaut",
    body: "Dieser Bereich kommt als Nächstes.",
  },
} as const;
