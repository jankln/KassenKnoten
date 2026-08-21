"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { de } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";

/**
 * A modal on wide screens, a bottom sheet on narrow ones — the same component, because
 * a phone dialog that floats in the middle of the screen puts its actions out of reach.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  children,
  className,
  title,
  description,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  title: string;
  description?: ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          "bg-surface border-line fixed z-50 border shadow-xl outline-none",
          // Phone: a sheet anchored to the bottom edge, within thumb reach.
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 rounded-t-2xl px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
          // A sheet grows upwards from the bottom edge, so without a ceiling a tall form
          // — a shared cost with a split editor, on a 375 px phone — pushes its own
          // title and first fields above the viewport, where they cannot be reached.
          // dvh rather than vh because the mobile keyboard shrinks the visual viewport
          // the moment a field is focused.
          "max-h-[88dvh] overflow-y-auto overscroll-contain",
          // Desktop: a centred card.
          "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:rounded-card sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:px-6 sm:pb-6",
          className,
        )}
        {...props}
      >
        {/* The header sticks while the form scrolls under it: on a phone the close
            button is otherwise the first thing to leave the screen.
            The sheet deliberately has no top padding of its own — a scroll container's
            padding scrolls away with the content, which would leave a strip above the
            sticky header for the form to show through. The header owns that space
            instead, and negative side margins let its background span the full width. */}
        <div className="bg-surface sticky top-0 z-10 -mx-5 mb-5 flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:-mx-6 sm:px-6 sm:pt-6">
          <div>
            <DialogPrimitive.Title className="font-display text-lg font-semibold tracking-tight">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-ink-muted mt-1 text-sm">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">
                {title}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label={de.actions.cancel}
            className="text-ink-muted hover:text-ink hover:bg-surface-muted rounded-control -mt-1 -mr-1 p-1.5 transition-colors"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
