import type { ReactNode } from "react";
import { SettingsSidebar } from "./settings-nav";

/**
 * Settings: an overview of categories, and one page per category. On a wide screen the
 * category list stays beside the page, so moving from sign-in to backups is one click.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex lg:gap-8">
      <div className="empty:hidden lg:w-52 lg:shrink-0">
        <SettingsSidebar />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
