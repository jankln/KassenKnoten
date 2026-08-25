"use client";

import { createContext, use, type ReactNode } from "react";
import { messagesFor, type Locale, type Messages } from "@/lib/i18n";

/**
 * The active messages, for client components.
 *
 * Only the locale crosses the boundary from the server, never the messages themselves:
 * the message sets hold functions for every string that interpolates a value, and
 * functions cannot be serialised into a client component. So both sets are in the client
 * bundle and this picks one — a few kilobytes of strings, in exchange for the whole app
 * being able to interpolate.
 */
const MessagesContext = createContext<Messages | null>(null);

export function MessagesProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <MessagesContext.Provider value={messagesFor(locale)}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages(): Messages {
  const messages = use(MessagesContext);
  if (!messages) {
    throw new Error("useMessages must be used inside a MessagesProvider.");
  }
  return messages;
}
