/**
 * The domain registry.
 *
 * Every subject the project holds is listed here once, by `id@version`, with
 * its manifest and its definition. Switching subject means changing
 * `ACTIVE_PACKAGE` to another key in this list — no engine file changes, no
 * imports moved around. Old versions stay registered and retired, so an
 * activation can always be put back.
 *
 * Registration is deliberately static: the browser bundle must know at build
 * time which subject it ships with. Generated subjects add their entry here
 * (the pipeline writes the line) and are activated by the activation script
 * only once every blocking check has passed.
 */
import { itDomain, itManifest } from "./packages/it";
import type { DomainDefinition } from "./types";
import type { DomainManifest, DomainPackage } from "./package";

export interface RegistryEntry {
  manifest: DomainManifest;
  definition: DomainDefinition;
  /** Loads the full package. Server and scripts only; heavy. */
  load?: () => Promise<DomainPackage>;
}

/** Every subject version this build knows about. */
export const registry: Record<string, RegistryEntry> = {
  [itManifest.key]: {
    manifest: itManifest,
    definition: itDomain,
    load: async () => (await import("@/content/packs/it-package")).buildItPackage(),
  },
};

/**
 * The live subject. One line, one key. The activation script rewrites it and
 * records the change; rollback rewrites it back.
 */
export const ACTIVE_PACKAGE = itManifest.key;

/** The active entry, or a clear failure if the key was pointed at nothing. */
export function activeEntry(): RegistryEntry {
  const entry = registry[ACTIVE_PACKAGE];
  if (!entry) {
    throw new Error(
      `No domain package registered as "${ACTIVE_PACKAGE}". Registered: ${Object.keys(registry).join(", ") || "none"}.`,
    );
  }
  return entry;
}

/** Every registered key, newest first within a subject. */
export function registeredKeys(): string[] {
  return Object.keys(registry).sort();
}

/** Look one up without throwing. */
export function findEntry(key: string): RegistryEntry | undefined {
  return registry[key];
}
