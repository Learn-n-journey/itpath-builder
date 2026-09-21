/**
 * The active course pack.
 *
 * The subject is chosen in one place only: `ACTIVE_PACKAGE` in the domain
 * registry. This file looks that key up and hands back the matching material,
 * so wording and material can never disagree. Authored subjects register a
 * hand-written pack; subjects produced by the pipeline register their package
 * and are adapted to the same contract. See src/content/README.md.
 */
import { ACTIVE_PACKAGE } from "@/domain/registry";
import { domainOverride } from "@/lib/active-domain";
import { itPack } from "@/content/packs/it-pack";
import { autoRepairPackage as autoRepair2_0_0Package } from "@/content/packs/auto-repair/2.0.0/package";
import { autoRepairPackage as autoRepair3_4_0Package } from "@/content/packs/auto-repair/3.4.0/package";
import { coursePackFromDomainPackage } from "@/content/packs/from-package";
import { customPathPack } from "@/content/packs/custom-path-pack";
import { learningPathForKey } from "@/lib/learning-path-store";
import type { CoursePack } from "@/content/pack-contract";

/** Every subject's material, by the same key the registry uses. */
const packs: Record<string, () => CoursePack> = {
  "it-cybersecurity@1.0.0": () => itPack,
  "auto-repair@2.0.0": () => coursePackFromDomainPackage(autoRepair2_0_0Package),
  "auto-repair@3.4.0": () => coursePackFromDomainPackage(autoRepair3_4_0Package),
};

function resolveActivePack(): CoursePack {
  // A device-level choice from Settings wins over the build default; both
  // keys come from the same registry, so material can never disagree.
  const key = domainOverride() ?? ACTIVE_PACKAGE;
  // A path created in Settings has no build-time material at all: it is built
  // from its saved section list and filled by its spreadsheets.
  const created = learningPathForKey(key);
  if (created) return customPathPack(created);
  const build = packs[key];
  if (!build) {
    throw new Error(
      `The active subject "${key}" has no material registered in src/content/course-pack.ts. ` +
        `Registered material: ${Object.keys(packs).join(", ") || "none"}.`,
    );
  }
  return build();
}

export const coursePack: CoursePack = resolveActivePack();

export type { CoursePack, SubjectProfile } from "@/content/pack-contract";
