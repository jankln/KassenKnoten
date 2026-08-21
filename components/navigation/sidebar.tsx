"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KnotMark } from "@/components/brand/knot-mark";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { isCurrent, navItems } from "./nav-items";

/** Desktop navigation. Hidden below `lg`, where the bottom bar takes over. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label={de.nav.menu}
      className="border-line bg-surface hidden w-60 shrink-0 flex-col border-r px-3 py-5 lg:flex"
    >
      <Link href="/" className="rounded-control mb-7 flex items-center gap-2.5 px-2">
        <KnotMark className="h-7 w-7" />
        <span className="font-display text-lg font-semibold tracking-tight">
          {de.app.name}
        </span>
      </Link>

      <ul className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const current = isCurrent(item.href, pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "rounded-control flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors",
                  current
                    ? "bg-surface-muted text-ink"
                    : "text-ink-muted hover:text-ink hover:bg-surface-muted/60",
                )}
              >
                <item.icon className="size-[18px]" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
