"use client";

import { Toaster as Sonner } from "sonner";

/**
 * Toasts exist for one reason here: to offer "Rückgängig" after something is removed.
 * That is why removal never asks for confirmation — the undo is the confirmation.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface !text-ink !border-line !rounded-card !border !font-sans !shadow-lg",
          description: "!text-ink-muted",
          actionButton: "!bg-brass !text-brass-ink !rounded-control !font-medium",
        },
      }}
    />
  );
}
