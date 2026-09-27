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
import { readSubjectCookie, writeSubjectCookie } from "@/lib/subject-cookie";
import { learningPathForKey, learningPaths } from "@/lib/learning-path-store";
import { pathAppName, pathKey } from "@/lib/learning-paths-shared";

const OVERRIDE_KEY = "itpath.active-domain.v1";

export interface DomainOption {
  key: string;
  name: string;
}

/**
 * One option per subject: the newest registered version of each. Older
 * versions stay registered for rollback but do not belong in a menu.
 */
export function domainOptions(): DomainOption[] {
  const newest = new Map<string, string>();
  for (const key of registeredKeys()) {
    const [id = key] = key.split("@");
    const held = newest.get(id);
    if (!held || key.localeCompare(held) > 0) newest.set(id, key);
  }
  const built = [...newest.values()].map((key) => ({
    key,
    name: registry[key]?.manifest.name ?? key,
  }));
  const created = learningPaths().map((path) => ({
    key: pathKey(path.slug),
    name: pathAppName(path.name),
  }));
  return [...built, ...created];
}


/** The newest registered key for a subject id, or null when it is unknown. */
function newestKeyFor(id: string): string | null {
  return domainOptions().find((option) => option.key.split("@")[0] === id)?.key ?? null;
}

/**
 * The stored override, or null when the device follows the build default.
 * A stored choice from a retired version still resolves to the same subject's
 * newest registered version, so a saved choice never silently falls back.
 */
export function domainOverride(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(OVERRIDE_KEY) ?? readSubjectCookie();
    if (!stored) return null;
    // Created paths have no version migration: their exact key is the identity.
    if (learningPathForKey(stored)) return stored;

    // Built-in subjects may keep retired versions registered for rollback, but
    // a learner's saved subject choice means "this subject", not "pin this old
    // package forever". Always resolve it to that subject's newest registered
    // version. This is especially important for AUTO PATH because spreadsheet
    // topic IDs follow the current authored curriculum.
    const [id = stored] = stored.split("@");
    const newest = newestKeyFor(id);
    if (newest) return newest;

    // Unknown keys are ignored rather than opening mismatched material.
    return null;
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
  // Mirrored so the server knows, on the very next page load, that this
  // visitor is not on the default course.
  writeSubjectCookie(key === ACTIVE_PACKAGE ? null : key);
}
