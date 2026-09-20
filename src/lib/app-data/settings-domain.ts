/**
 * Keep the learner's settings pointing at the course they are actually on.
 *
 * The certification target and target job are saved as plain text. When the
 * device switches subject, a target saved for the other subject no longer
 * exists in the active material, so the dashboard would keep naming a
 * qualification the course does not teach. This reconciles those two settings
 * against the active subject, leaving valid choices untouched.
 */
import { certifications } from "@/data/static-content";
import { domain } from "@/domain/active";
import type { UserData } from "./types";

/** True when the saved target names a certification the active course teaches. */
function targetExists(target: string): boolean {
  return certifications.some((item) => item.id === target || item.title === target);
}

/** The saved target, or the active subject's default when it belongs elsewhere. */
export function resolveCertificationTarget(target: string): string {
  if (target && targetExists(target)) return target;
  return certifications[0]?.title ?? domain.defaultQualification;
}

/** A copy of the record whose settings match the active subject. */
export function reconcileSettingsToDomain(user: UserData): UserData {
  const target = resolveCertificationTarget(user.settings.certificationTarget);
  if (target === user.settings.certificationTarget) return user;
  return {
    ...user,
    settings: {
      ...user.settings,
      certificationTarget: target,
      // The saved job goes with the old course too, so it moves with it.
      targetJob: domain.defaultGoal,
    },
  };
}
