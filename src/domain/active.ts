/**
 * The active domain.
 *
 * The app reads the subject from the registry rather than importing one by
 * name, so switching subject is a registry change and nothing else. Keep
 * importing `domain` from here; that has not changed.
 */
import { activeEntry, ACTIVE_PACKAGE, findEntry } from "./registry";
import type { DomainDefinition } from "./types";

/**
 * The key this device opens with. On the server and in scripts that is always
 * the build default; in the browser a subject chosen in settings wins, read
 * straight from storage so the definition is settled before first render.
 */
function openedWith(): string {
  if (typeof window === "undefined") return ACTIVE_PACKAGE;
  try {
    const stored = window.localStorage.getItem("itpath.active-domain.v1");
    return stored && findEntry(stored) ? stored : ACTIVE_PACKAGE;
  } catch {
    return ACTIVE_PACKAGE;
  }
}

const key = openedWith();
const entry = findEntry(key) ?? activeEntry();

export const domain: DomainDefinition = entry.definition;

/** Which package version the app is running, for logs and the about page. */
export const activeDomainKey = key;

export const activeDomainManifest = entry.manifest;

export type { DomainDefinition } from "./types";
export { capitalise } from "./types";
