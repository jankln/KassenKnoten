import {
  Baby,
  BookOpen,
  Car,
  Cat,
  CircleDashed,
  Coffee,
  CreditCard,
  Dumbbell,
  Gift,
  Hammer,
  HeartPulse,
  House,
  Monitor,
  Plane,
  Play,
  Shield,
  ShoppingBasket,
  Smartphone,
  Ticket,
  TrainFront,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The icons a category may use.
 *
 * An explicit map rather than a lookup over all of lucide: this way the bundle carries
 * the two dozen icons the app actually offers, not the two thousand it does not.
 */
const ICONS = {
  house: House,
  wifi: Wifi,
  shield: Shield,
  "train-front": TrainFront,
  car: Car,
  plane: Plane,
  "shopping-basket": ShoppingBasket,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  play: Play,
  monitor: Monitor,
  smartphone: Smartphone,
  ticket: Ticket,
  users: Users,
  "book-open": BookOpen,
  gift: Gift,
  cat: Cat,
  baby: Baby,
  hammer: Hammer,
  coffee: Coffee,
  "credit-card": CreditCard,
  "circle-dashed": CircleDashed,
} satisfies Record<string, LucideIcon>;

export type CategoryIconName = keyof typeof ICONS;

export const CATEGORY_ICON_NAMES = Object.keys(ICONS) as CategoryIconName[];

export function isCategoryIconName(value: string): value is CategoryIconName {
  return value in ICONS;
}

/** Falls back to the neutral dashed circle, so an unknown name never renders nothing. */
export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = isCategoryIconName(name) ? ICONS[name] : CircleDashed;
  return <Icon className={cn("size-[18px]", className)} aria-hidden />;
}
