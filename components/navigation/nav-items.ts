import {
  LayoutDashboard,
  PiggyBank,
  Receipt,
  ShoppingBasket,
  Users,
} from "lucide-react";
import { de } from "@/lib/i18n/de";

/**
 * The five sections that carry data. Settings is deliberately not among them — it is not
 * somewhere you go every day, and at 375 px five targets are already 75 px wide, which is
 * comfortable for a thumb but leaves no room for a sixth.
 *
 * "Variabel" rather than "Variable Kosten" for the same reason: the label has to survive
 * a fifth of a phone screen, and the icon carries the rest of the meaning.
 */
export const navItems = [
  { href: "/", label: de.nav.overview, icon: LayoutDashboard },
  { href: "/haushalt", label: de.nav.household, icon: Users },
  { href: "/fixkosten", label: de.nav.fixedCosts, icon: Receipt },
  { href: "/variable-kosten", label: de.nav.variableCosts, icon: ShoppingBasket },
  { href: "/sparen", label: de.nav.savings, icon: PiggyBank },
] as const;

/** Whether a nav item should read as current for the given path. */
export function isCurrent(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
