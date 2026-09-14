import { expect, test, type Page } from "@playwright/test";
import { en } from "../lib/i18n/en";

/**
 * The critical path, end to end: sign in, set up the household, add a shared cost split
 * by income, and read the right shares on the overview.
 *
 * It is the journey the product exists for, and each step is one the unit tests cannot
 * see — a form that no longer submits, a redirect that loops, a route missing from the
 * standalone build. It runs against that build at 375 px, on a fresh database.
 *
 * The copy comes from the message file, so rewording a button does not break the test;
 * removing one does.
 *
 * Figures are the example household from docs/WORKFLOW.md. The expected shares are
 * worked out by hand, not by calling the app's split function, so the test cannot agree
 * with a bug in it: 1182,35 € at 2050:2310 is 555,92… and 626,42… with one cent left over,
 * which the largest remainder (…,855 against …,144) gives to Robin.
 */

const PASSWORD = process.env.E2E_PASSWORD ?? "";
const t = en;

/** A number as the app writes it, with whatever space Intl puts before the sign. */
const euros = (amount: string) => new RegExp(`${amount.replace(".", "\\.")}\\s€`);

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(
    scrollWidth,
    "the page must not scroll sideways at 375 px",
  ).toBeLessThanOrEqual(clientWidth);
}

test.describe.configure({ mode: "serial" });

test("a household is set up and a shared cost splits by income", async ({ page }) => {
  expect(PASSWORD, "E2E_PASSWORD comes from playwright.config.ts").not.toBe("");

  await test.step("a fresh instance asks for the password", async () => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expectNoHorizontalOverflow(page);

    await page.getByLabel(t.login.password).fill(PASSWORD);
    await page.getByRole("button", { name: t.login.submit, exact: true }).click();
  });

  await test.step("the wizard sets up Alex and Robin with their incomes", async () => {
    await expect(page).toHaveURL(/\/willkommen$/);
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: t.onboarding.next }).click();

    await page.getByLabel(t.onboarding.memberName, { exact: true }).fill("Alex");
    await page.getByRole("button", { name: t.onboarding.addSecondMember }).click();
    await page
      .getByLabel(`${t.onboarding.memberName} 2`, { exact: true })
      .fill("Robin");
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: t.onboarding.next }).click();

    const incomes = [
      { legend: t.onboarding.incomeFor("Alex"), amount: "2050" },
      { legend: t.onboarding.incomeFor("Robin"), amount: "2310" },
    ];
    for (const { legend, amount } of incomes) {
      const person = page.getByRole("group", { name: legend });
      await person.getByLabel(t.sections.household.incomeLabel).fill("Salary");
      await person.getByLabel(t.sections.household.amount).fill(amount);
    }
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: t.onboarding.finish }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  await test.step("a shared rent is split by income, previewed before saving", async () => {
    await page.goto("/fixkosten?bereich=gemeinsam");
    await page.getByRole("button", { name: t.sections.fixedCosts.addShared }).click();

    const dialog = page.getByRole("dialog", { name: t.sections.fixedCosts.newShared });
    await dialog.getByLabel(t.sections.fixedCosts.expenseLabel).fill("Rent");
    await dialog.getByLabel(t.sections.household.amount).fill("1182,35");
    await dialog
      .getByRole("button", { name: t.sections.fixedCosts.splitIncome })
      .click();

    await expect(dialog).toContainText(euros("555,92"));
    await expect(dialog).toContainText(euros("626,43"));
    await expectNoHorizontalOverflow(page);

    await dialog.getByRole("button", { name: t.actions.save }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Rent")).toBeVisible();
  });

  await test.step("the overview charges each person their share", async () => {
    await page.goto("/");
    const people = page.getByRole("region", { name: t.sections.overview.people.title });

    for (const [name, share] of [
      ["Alex", "555,92"],
      ["Robin", "626,43"],
    ] as const) {
      const card = people
        .locator("div.space-y-3 > *")
        .filter({ has: page.getByRole("heading", { name, exact: true }) });
      const sharedCosts = card
        .locator("dt", {
          hasText: new RegExp(`^${t.sections.overview.people.sharedShare}$`),
        })
        .locator("xpath=following-sibling::dd");
      await expect(sharedCosts).toHaveText(euros(share));
    }
    await expectNoHorizontalOverflow(page);
  });
});
