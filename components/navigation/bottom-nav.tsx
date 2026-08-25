"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isCurrent, navItems } from "./nav-items";
import { useMessages } from "@/components/providers/messages-provider";

/**
 * Mobile navigation. Fixed to the bottom within thumb reach, and padded for the home
 * indicator so the last row of a list is never hidden behind it.
 */
export function BottomNav() {
  const t = useMessages();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t.nav.menu}
      className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-20 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="flex">
        {navItems(t).map((item) => {
          const current = isCurrent(item.href, pathname);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  current ? "text-ink" : "text-ink-muted",
                )}
              >
                <item.icon
                  className={cn("size-5", current && "text-brass")}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
