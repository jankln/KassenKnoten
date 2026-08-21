import { LayoutDashboard, PiggyBank, Receipt, Users } from "lucide-react";
import { de } from "@/lib/i18n/de";

/**
 * The four sections that carry data. Settings is deliberately not among them: on a phone
 * four targets stay comfortably wide at 375 px, five do not, and settings is not somewhere
 * you go every day.
 */
export const navItems = [
  { href: "/", label: de.nav.overview, icon: LayoutDashboard },
  { href: "/haushalt", label: de.nav.household, icon: Users },
  { href: "/fixkosten", label: de.nav.fixedCosts, icon: Receipt },
  { href: "/sparen", label: de.nav.savings, icon: PiggyBank },
] as const;

/** Whether a nav item should read as current for the given path. */
export function isCurrent(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
