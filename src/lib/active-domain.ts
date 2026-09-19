/**
 * Per-device subject override.
 *
 * The build-time subject is `ACTIVE_PACKAGE` in the domain registry. Settings
 * lets a learner pick any other registered subject; the choice is stored here
 * and applied on the next app load, before the course pack resolves. The
 * registry stays the source of truth for what exists — this only picks which
 * registered key this device opens.
 */
import { ACTIVE_PACKAGE, findEntry, registeredKeys, registry } from "@/domain/registry";

const OVERRIDE_KEY = "itpath.active-domain.v1";

export interface DomainOption {
  key: string;
  name: string;
}

/** Every registered subject, as menu options. */
export function domainOptions(): DomainOption[] {
  return registeredKeys().map((key) => ({
    key,
    name: registry[key]?.manifest.name ?? key,
  }));
}

/** The stored override, or null when the device follows the build default. */
export function domainOverride(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(OVERRIDE_KEY);
    return stored && findEntry(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** The subject key this device actually opens with. */
export function activeDomainKey(): string {
  return domainOverride() ?? ACTIVE_PACKAGE;
}

/** Store a new choice (or clear it with the build default key). */
export function setDomainOverride(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key === ACTIVE_PACKAGE) {
      window.localStorage.removeItem(OVERRIDE_KEY);
    } else {
      window.localStorage.setItem(OVERRIDE_KEY, key);
    }
  } catch {
    /* storage unavailable; the switch simply will not persist */
  }
}
