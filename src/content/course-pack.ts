/**
 * The active course pack.
 *
 * This file is the single switch for subject matter, the twin of
 * `src/domain/active.ts` which is the switch for subject wording. A new
 * subject means a new pack under `src/content/packs` and one changed line
 * here. Nothing else in the app needs to change; see src/content/README.md.
 */
import { itPack } from "@/content/packs/it-pack";
import type { CoursePack } from "@/content/pack-contract";

export const coursePack: CoursePack = itPack;

export type { CoursePack, SubjectProfile } from "@/content/pack-contract";
