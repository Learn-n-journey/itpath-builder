/**
 * The active domain.
 *
 * The app reads the subject from the registry rather than importing one by
 * name, so switching subject is a registry change and nothing else. Keep
 * importing `domain` from here; that has not changed. Paths created in
 * Settings are not in the registry: their definition is built from the saved
 * path, cached on the device so it is settled before first render.
 */
import { activeEntry, ACTIVE_PACKAGE, findEntry } from "./registry";
import type { DomainDefinition } from "./types";
import { learningPathForKey } from "@/lib/learning-path-store";
import { pathDefinition, PATH_VERSION } from "@/lib/learning-paths-shared";

function openedWith(): string {
  if (typeof window === "undefined") return ACTIVE_PACKAGE;
  try {
    const stored = window.localStorage.getItem("itpath.active-domain.v1");
    if (!stored) return ACTIVE_PACKAGE;
    return findEntry(stored) || learningPathForKey(stored) ? stored : ACTIVE_PACKAGE;
  } catch {
    return ACTIVE_PACKAGE;
  }
}

const key = openedWith();
const createdPath = findEntry(key) ? undefined : learningPathForKey(key);
const entry = findEntry(key) ?? activeEntry();

export const domain: DomainDefinition = createdPath
  ? pathDefinition(createdPath)
  : entry.definition;

/** Which package version the app is running, for logs and the about page. */
export const activeDomainKey = key;

export const activeDomainManifest = createdPath
  ? {
      ...entry.manifest,
      id: createdPath.slug,
      version: PATH_VERSION,
      key,
      name: domain.appName,
    }
  : entry.manifest;

export type { DomainDefinition } from "./types";
export { capitalise } from "./types";
