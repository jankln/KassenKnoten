/**
 * Which rows of `app_setting` describe this instance rather than the household.
 *
 * The table holds both, and a backup is only meant to carry one of them. A household's
 * data may travel between instances and back in time; the way this instance lets people
 * in and the code it runs may not. Restoring a file must never change who can sign in or
 * switch an extension back on — an extension runs with full access to the server (#15).
 *
 * By namespace, so a setting added later under one of them is covered without anybody
 * remembering this file: sign-in keys live under `auth.` (server/services/sign-in.ts),
 * extension switches under `extensions.` (server/extensions/store.ts).
 */
const INSTANCE_NAMESPACES = ["auth.", "extensions."] as const;

export function isInstanceSetting(key: string): boolean {
  return INSTANCE_NAMESPACES.some((namespace) => key.startsWith(namespace));
}
