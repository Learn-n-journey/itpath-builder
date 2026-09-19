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
import { autoRepairManifest as autoRepair2_0_0Manifest } from "@/content/packs/auto-repair/2.0.0/manifest";
import { autoRepairDomain as autoRepair2_0_0Domain } from "@/content/packs/auto-repair/2.0.0/domain";
import { autoRepairPackage as autoRepair2_0_0Package } from "@/content/packs/auto-repair/2.0.0/package";
import { autoRepairManifest as autoRepair3_4_0Manifest } from "@/content/packs/auto-repair/3.4.0/manifest";
import { autoRepairDomain as autoRepair3_4_0Domain } from "@/content/packs/auto-repair/3.4.0/domain";
import { autoRepairPackage as autoRepair3_4_0Package } from "@/content/packs/auto-repair/3.4.0/package";
import { autoRepairManifest as autoRepair3_5_0Manifest } from "@/content/packs/auto-repair/3.5.0/manifest";
import { autoRepairDomain as autoRepair3_5_0Domain } from "@/content/packs/auto-repair/3.5.0/domain";
import { autoRepairPackage as autoRepair3_5_0Package } from "@/content/packs/auto-repair/3.5.0/package";
import { autoRepairManifest as autoRepair3_6_0Manifest } from "@/content/packs/auto-repair/3.6.0/manifest";
import { autoRepairDomain as autoRepair3_6_0Domain } from "@/content/packs/auto-repair/3.6.0/domain";
import { autoRepairPackage as autoRepair3_6_0Package } from "@/content/packs/auto-repair/3.6.0/package";
import { autoRepairManifest as autoRepair3_7_0Manifest } from "@/content/packs/auto-repair/3.7.0/manifest";
import { autoRepairDomain as autoRepair3_7_0Domain } from "@/content/packs/auto-repair/3.7.0/domain";
import { autoRepairPackage as autoRepair3_7_0Package } from "@/content/packs/auto-repair/3.7.0/package";

export interface RegistryEntry {
  manifest: DomainManifest;
  definition: DomainDefinition;
  /** Loads the full package. Server and scripts only; heavy. */
  load?: () => Promise<DomainPackage>;
  /**
   * The complete package, already in the bundle. Generated subjects carry one
   * so the app can read their content without an async load; the authored IT
   * subject leaves it out and keeps reading its own authored data.
   */
  packageSync?: DomainPackage;
}

/** Every subject version this build knows about. */
export const registry: Record<string, RegistryEntry> = {
  "auto-repair@3.7.0": {
    manifest: autoRepair3_7_0Manifest,
    definition: autoRepair3_7_0Domain,
    packageSync: autoRepair3_7_0Package,
    load: async () => autoRepair3_7_0Package,
  },
  "auto-repair@3.6.0": {
    manifest: autoRepair3_6_0Manifest,
    definition: autoRepair3_6_0Domain,
    packageSync: autoRepair3_6_0Package,
    load: async () => autoRepair3_6_0Package,
  },
  "auto-repair@3.5.0": {
    manifest: autoRepair3_5_0Manifest,
    definition: autoRepair3_5_0Domain,
    packageSync: autoRepair3_5_0Package,
    load: async () => autoRepair3_5_0Package,
  },
  "auto-repair@3.4.0": {
    manifest: autoRepair3_4_0Manifest,
    definition: autoRepair3_4_0Domain,
    packageSync: autoRepair3_4_0Package,
    load: async () => autoRepair3_4_0Package,
  },
  "auto-repair@2.0.0": {
    manifest: autoRepair2_0_0Manifest,
    definition: autoRepair2_0_0Domain,
    packageSync: autoRepair2_0_0Package,
    load: async () => autoRepair2_0_0Package,
  },
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
export const ACTIVE_PACKAGE = "it-cybersecurity@1.0.0";

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
