/**
 * Every user-facing string in the app, in English.
 *
 * This file is the canonical shape: `Messages` is derived from it, and every other
 * language is declared as `Messages`, so the compiler refuses a build where a translation
 * has fallen behind. That check is the only reason a second language stays complete past
 * the week somebody added it.
 *
 * Keeping the copy in one file per language is what makes reviewing it possible: the
 * whole voice of the product can be read in one sitting, and a heading cannot quietly
 * drift out of step with the button below it.
 *
 * A user-facing string hardcoded in a component is a bug.
 */
export const en = {
  app: {
    name: "KassenKnoten",
    tagline: "Plan your household finances",
  },

  /** The name of each language, in that language. Never translated. */
  languages: {
    en: "English",
    de: "Deutsch",
  },

  language: {
    label: "Language",
    hint: "Applies to everyone in this household.",
    chooseTitle: "Which language would you like?",
    chooseBody:
      "KassenKnoten speaks English and German. You can change this later in the settings.",
  },

  login: {
    intro: "This household plan is protected by a password.",
    introWithCode:
      "This household plan is protected by a password and a one-time code.",
    password: "Household password",
    code: "Code from your app",
    codeHint: "Six digits, changes every 30 seconds.",
    submit: "Sign in",
    pending: "Checking …",
    passwordMissing: "Please enter the household password.",
    codeMissing: "Please enter the six-digit code from your app.",
    // Deliberately vague about which of the two was wrong: naming the factor would tell
    // someone who is guessing which half they have already got right.
    failed: "Those credentials are not right.",
    codeUsed: "That code has already been used. Wait for the next one.",
    throttled: (duration: string) => `Too many attempts. Try again in ${duration}.`,
    oneMinute: "one minute",
    minutes: (count: number) => `${count} minutes`,
  },

  nav: {
    overview: "Overview",
    household: "Household",
    fixedCosts: "Fixed",
    variableCosts: "Variable",
    savings: "Savings",
    settings: "Settings",
    menu: "Navigation",
    skipToContent: "Skip to content",
  },

  onboarding: {
    title: "Welcome to KassenKnoten",
    subtitle: "Set up your household in a few steps.",
    steps: ["Start", "Household", "Income"] as [string, string, string],
    introTitle: "Your household plan starts here",
    introBody:
      "KassenKnoten helps you plan income, fixed costs and savings in one place. You can add more detail whenever you like.",
    membersTitle: "Who is in your household?",
    membersBody:
      "Add at least one person. The colours are how you will recognise who pays what at a glance.",
    memberName: "Name",
    memberNamePlaceholder: "e.g. Alex",
    addSecondMember: "Add another person",
    removeSecondMember: "Remove second person",
    incomeTitle: "Add income",
    incomeBody:
      "This step is optional. Enter one or more sources per person, or add them later under Household.",
    incomeFor: (name: string) => `Income for ${name}`,
    incomeSource: (number: number) => `Income source ${number}`,
    incomeLabelPlaceholder: "e.g. Salary",
    addIncome: "Add income source",
    removeIncome: "Remove",
    saving: "Saving …",
    skipIncome: "Skip",
    finish: "Create household",
    next: "Continue",
    back: "Back",
    stepLabel: (current: number, total: number) => `Step ${current} of ${total}`,
  },

  actions: {
    add: "Add",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    undo: "Undo",
    signOut: "Sign out",
    saved: "Saved.",
    back: "Back",
  },

  /** The months an entry applies to — shown in every income and fixed-cost form. */
  validity: {
    from: "Valid from",
    until: "Valid until",
    untilHint: "Leave empty if it keeps running.",
    fromHint: "The entry counts from this month on.",
    open: "ongoing",
    since: (month: string) => `from ${month}`,
    until_: (month: string) => `until ${month}`,
    range: (from: string, until: string) => `${from} – ${until}`,
    splitHint:
      "If you change the amount from a later month, the previous entry stays in place for the months before it.",

    /* Shown once the amount differs from the stored one, so the choice between "this is
       new from now on" and "this was always wrong" is made deliberately. */
    changeTitle: "What changed?",
    modeChange: "New amount from",
    modeCorrect: "It was always this",
    modeChangeHint: "The previous amount stays on record for the months before it.",
    modeCorrectHint:
      "Overwrites the entry retroactively, including months that are already settled.",
    previewTitle: "This is what will be saved",
    previewUntil: (month: string) => `until ${month}`,
    previewFrom: (month: string) => `from ${month}`,
    previewOld: "before",
    previewNew: "new",
    endedBefore: "Ended before this month",
    startsLater: "Starts later",
  },

  months: {
    previous: "Previous month",
    next: "Next month",
    today: "Today",
    current: "Current month",
  },

  theme: {
    label: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
  },

  sections: {
    overview: {
      title: "Overview",
      subtitle: "This month at a glance.",
      emptyMonth: {
        title: "Nothing on record for this month",
        body: "Income and fixed costs apply from the month you entered on them, so there is nothing to compute for earlier months.",
      },
      empty: {
        title: "Nothing to compute yet",
        body: "Add the people in your household, then their income or fixed costs. What is left each month shows up here straight away.",
        action: "Set up household",
      },
      kpi: {
        title: "Key figures",
        income: "Income",
        fixedCosts: "Fixed costs",
        variableCosts: "Variable costs",
        savingsRate: "Savings rate",
        freeCash: "Free cash",
        perMonth: "per month",
        ofIncome: (ratio: string) => `${ratio} of income`,
        bookedOfPlanned: (booked: string, planned: string) =>
          `${booked} of ${planned} booked`,
      },
      warnings: {
        title: "Notices",
        negativeFreeCash: (amount: string) =>
          `After every cost and savings rate, ${amount} a month is missing.`,
        overBudget: (name: string, amount: string) =>
          `“${name}” is ${amount} over budget.`,
        savingsAboveIncome: "The savings rate is higher than the monthly income.",
        overTarget: (name: string) => `The pot “${name}” is past its target.`,
      },
      people: {
        title: "Per person",
        income: "Income",
        ownFixed: "Own fixed costs",
        sharedShare: "Shared costs",
        ownVariable: "Own variable costs",
        sharedVariableShare: "Shared variable",
        freeAfterSavings: "Free after savings",
        savingsRate: "Savings rate",
      },
      categories: {
        title: "Costs by category",
        uncategorized: "No category",
        total: "Total",
      },
      variable: {
        title: "Variable costs",
        empty: "No variable costs yet.",
        action: "Open variable costs",
        planned: "Planned",
        booked: "Booked",
        counts: "Counts",
        total: "Total",
      },
      savings: {
        title: "Savings pots",
        balance: "Balance",
        monthlyRate: "Rate",
        target: "Target",
        progress: "Progress",
        noTarget: "No target set",
        overTarget: "Past its target",
      },
      trend: {
        title: "Month by month",
        empty: "The trend needs at least two months to draw.",
        income: "Income",
        fixedCosts: "Fixed costs",
        variableCosts: "Variable costs",
        savingsRate: "Savings rate",
        freeCash: "Free cash",
        chartLabel:
          "Income, fixed costs, variable costs, savings rate and free cash over time",
        dataLabel: "Monthly figures",
      },
    },
    household: {
      title: "Household",
      subtitle: "Who is in it, and who earns what.",
      empty: {
        title: "Nobody added yet",
        body: "Start with the people who live here. After that you can add income and build the monthly plan.",
        action: "Add person",
      },
      total: "Total income",
      addMember: "Add person",
      editMember: "Edit person",
      newMember: "New person",
      memberName: "Name",
      memberNamePlaceholder: "e.g. Alex",
      color: "Colour",
      colorHint: "This colour stands for this person everywhere.",
      removeMember: "Remove person",
      memberRemoved: (name: string) => `${name} removed.`,
      noIncome: "No income yet",
      addIncome: "Add income",
      editIncome: "Edit income",
      newIncome: "New income",
      incomeLabel: "Label",
      incomeLabelPlaceholder: "e.g. Salary",
      incomeKind: "Kind",
      incomeKindSalary: "Salary",
      incomeKindOther: "Other",
      amount: "Amount",
      interval: "Rhythm",
      removeIncome: "Remove income",
      incomeRemoved: "Income removed.",
    },
    fixedCosts: {
      title: "Fixed costs",
      subtitle: "What leaves the account every month — private and shared.",
      private: "Private",
      shared: "Shared",
      empty: {
        title: "No fixed costs yet",
        body: "Rent, electricity, subscriptions: anything charged regularly belongs here. Start with one entry per person.",
        action: "Add fixed cost",
      },
      noMembers: {
        title: "People first",
        body: "A fixed cost always belongs to somebody. Add the people in your household first.",
        action: "Go to household",
      },
      noneForMember: "No fixed costs yet — add the first entry.",
      addExpense: "Add fixed cost",
      addShort: "Add",
      editExpense: "Edit fixed cost",
      newExpense: "New fixed cost",
      expenseLabel: "Label",
      expenseLabelPlaceholder: "e.g. Sports club",
      category: "Category",
      noCategory: "No category",
      person: "Person",
      removeExpense: "Remove fixed cost",
      expenseRemoved: "Entry removed.",
      privateTotal: "Private fixed costs",
      sharedTotal: "Shared fixed costs",
      grandTotal: "Fixed costs total",
      addShared: "Add shared cost",
      newShared: "New shared cost",
      editShared: "Edit shared cost",
      sharedEmpty: {
        title: "No shared costs yet",
        body: "Rent, electricity, internet: everything you carry together. You decide how each item is split.",
        action: "Add shared cost",
      },
      split: "Split",
      splitFixed: "Fixed quota",
      splitIncome: "By income",
      splitIncomeHint: "Recomputed from the current incomes.",
      splitNoIncomeHint: "Without income it is split evenly.",
      splitPreview: "How this splits",
      defaultSplit: "Default split",
      defaultSplitHint:
        "Pre-fills new shared costs. Existing items stay exactly as they are.",
    },
    savings: {
      title: "Savings",
      subtitle: "Pots, rates and reserves.",
      empty: {
        title: "No savings pots yet",
        body: "Emergency fund, holiday, index fund: create a pot and set the monthly rate to keep your goal in view.",
        action: "Create pot",
      },
      addPot: "Create pot",
      newPot: "New pot",
      editPot: "Edit pot",
      potName: "Name",
      potNamePlaceholder: "e.g. Holiday",
      monthlyRate: "Monthly rate",
      balance: "Current balance",
      target: "Target (optional)",
      owner: "Belongs to",
      household: "The household",
      note: "Note (optional)",
      notePlaceholder: "What is this pot for?",
      noTarget: "No target set",
      progress: "Progress",
      targetOf: "of",
      overTarget: "Target reached — you are past it.",
      removePot: "Remove pot",
      potRemoved: "Pot removed.",
      totalRate: "Total savings rate",
      totalBalance: "Total balance",
    },
    variableCosts: {
      title: "Variable costs",
      subtitle: "What is not the same every month.",
      private: "Private",
      shared: "Shared",
      addCost: "Create item",
      newCost: "New item",
      editCost: "Edit item",
      costLabel: "Label",
      costLabelPlaceholder: "e.g. Groceries",
      category: "Category",
      noCategory: "No category",
      person: "Belongs to",
      planned: "Planned per month",
      plannedHint: "In detailed mode this is your budget for the month.",

      /** The one real decision in this form. */
      mode: "How is this kept?",
      modePlan: "Plan",
      modeDetailed: "Detailed",
      modePlanHint:
        "The planned amount always counts. Good for anything you do not want to keep receipts for.",
      modeDetailedHint:
        "What you actually enter counts. Every expense comes with a date, and the plan becomes the budget.",
      modeBadgePlan: "Plan",
      modeBadgeDetailed: "Detailed",

      booked: "Booked",
      remaining: "Left",
      over: "Over",
      counts: "Counts",
      countsPlan: "The plan counts.",
      countsDetailed: "What is booked counts.",
      ofPlanned: (planned: string) => `of ${planned}`,
      noBudget: "No budget set",

      bookings: "Expenses",
      addBooking: "Add expense",
      newBooking: "New expense",
      editBooking: "Edit expense",
      bookingDate: "Date",
      bookingLabel: "What for? (optional)",
      bookingLabelPlaceholder: "e.g. Weekly shop",
      bookingAmount: "Amount",
      noBookings: "Nothing entered for this month yet.",
      bookingRemoved: "Expense removed.",
      removeBooking: "Remove expense",

      removeCost: "Remove item",
      costRemoved: "Item removed.",
      privateTotal: "Private total",
      sharedTotal: "Shared total",
      grandTotal: "Variable costs total",

      empty: {
        title: "No variable costs yet",
        body: "Groceries, fuel, going out: create an item and decide whether you plan a figure or enter every expense.",
        action: "Create the first item",
      },
      sharedEmpty: {
        title: "No shared items yet",
        body: "A shared item is split between you — by fixed quota or by income, exactly like a fixed cost.",
        action: "Create shared item",
      },
      noMembers: {
        title: "Household first",
        body: "A variable cost always belongs to somebody. Add the people in your household first.",
        action: "Go to household",
      },
    },

    settings: {
      title: "Settings",
      subtitle: "Language, split, categories and data.",
      themeHint: "Applies to this device only.",
      dataTitle: "Back up your data",
      dataHint: "Download a full backup or the current plan.",
      downloadJson: "Download JSON backup",
      downloadCsv: "Download plan as CSV",
      restoreTitle: "Restore a backup",
      restoreHint:
        "Restoring replaces all household data, including the monthly snapshots.",
      restoreFile: "JSON file",
      restoreConfirm: "I confirm that the existing household data may be replaced.",
      restore: "Restore backup",
      restoreMissingFile: "Please choose a JSON file first.",
      restoreNotConfirmed: "Please confirm explicitly that the data may be replaced.",
      restoreRequestInvalid: "The restore could not be started.",
      restoreFailed: "The backup could not be restored.",
      restoreSucceeded: "Backup restored.",
      csv: {
        headers: [
          "Type",
          "Label",
          "Person",
          "Category",
          "Amount (cents)",
          "Rhythm (months)",
          "Monthly (cents)",
          "Savings rate (cents)",
          "Balance (cents)",
          "Target (cents)",
          "Split",
        ] as string[],
        income: "Income",
        otherIncome: "Other income",
        sharedExpense: "Shared fixed cost",
        privateExpense: "Private fixed cost",
        sharedVariable: "Shared variable cost",
        privateVariable: "Private variable cost",
        savingsPot: "Savings pot",
        household: "Household",
        unknown: "Unknown",
      },
      categories: "Categories",
      categoriesHint: "How costs are sorted.",
      addCategory: "Add category",
      editCategory: "Edit category",
      newCategory: "New category",
      categoryName: "Name",
      categoryNamePlaceholder: "e.g. Pet",
      categoryIcon: "Icon",
      removeCategory: "Remove category",
      categoryRemoved: (name: string) => `${name} removed.`,
      systemCategoryHint: "Preset categories can be renamed, but not removed.",
    },
  },

  /** Labels for a recurrence expressed in months. */
  intervals: {
    1: "monthly",
    3: "quarterly",
    6: "twice a year",
    12: "yearly",
    /** Anything else, e.g. every four months. */
    other: (months: number) => `every ${months} months`,
  },

  units: {
    perMonth: "per month",
    perMonthShort: "/ month",
    perYear: "per year",
  },

  validation: {
    nameRequired: "Please enter a name.",
    nameTooLong: "That name is too long.",
    labelRequired: "Please enter a label.",
    labelTooLong: "That label is too long.",
    amountInvalid: "That is not a valid amount.",
    amountNegative: "The amount cannot be negative.",
    amountTooLarge: "The amount is too large.",
    targetPositive: "The target has to be greater than zero.",
    noteTooLong: "That note is too long.",
    iconInvalid: "Please choose an icon.",
    nameTaken: "That name already exists.",
    splitModeRequired: "Please choose how this is split.",
    sharesMustSum: "The shares have to add up to 100 %.",
    periodInvalid: "Please enter a valid month.",
    dateInvalid: "Please enter a valid date.",
    variableModeRequired: "Please choose how this item is kept.",
    periodEndBeforeStart: "The end cannot be before the start.",
    amountNotUnderstood: "Not a valid amount",
    failed: "That did not work. Please try again.",
  },

  /** Installing the app on the device — one entry per kind of browser advice. */
  install: {
    title: "Install as an app",
    hint: "Put KassenKnoten on your device like an app: own icon, own start, no address bar.",
    button: "Install now",
    installing: "Installing …",
    installed: "KassenKnoten is already installed on this device.",
    dismissed: "The installation was cancelled.",
    failed: "The installation could not be started.",
    ios: "In Safari, tap “Share” at the bottom and then “Add to Home Screen”.",
    firefoxMobile: "In Firefox, open the menu and choose “Add to Home screen”.",
    firefoxDesktop:
      "Firefox on the desktop cannot install web apps. Chrome, Edge and Safari can.",
    menu: "Open your browser’s menu and choose “Install app”. Many browsers also show an icon for it at the right of the address bar.",
  },

  /** Shown by the service worker when a page cannot be loaded. */
  offline: {
    title: "No connection",
    body: "KassenKnoten cannot reach your server right now. Your figures live there and are deliberately not cached on this device.",
    retry: "Try again",
  },

  underConstruction: {
    title: "Being built",
    body: "This part is coming next.",
  },
};

/**
 * The shape every language has to have. Derived from English rather than declared
 * separately, so there is one place to add a string and the compiler finds every
 * translation that has not caught up.
 */
export type Messages = typeof en;
