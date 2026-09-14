/**
 * Prescription layer: diagnosis -> teaching method, difficulty and activity.
 */
import type { ConceptProfile } from "@/lib/learner-model";
import type {
  ActivityRoute,
  Diagnosis,
  DifficultyBand,
  TeachingMethod,
} from "./types";

export interface Prescription {
  method: TeachingMethod;
  route: ActivityRoute;
  difficulty: DifficultyBand;
  instruction: string;
  estimatedMinutes: number;
}

const BY_DIAGNOSIS: Record<
  Diagnosis,
  { method: TeachingMethod; route: ActivityRoute; minutes: number; verb: string }
> = {
  never_learned: { method: "read", route: "/topics/$topicId", minutes: 35, verb: "Start" },
  prerequisite_gap: { method: "read", route: "/topics/$topicId", minutes: 30, verb: "Go back to" },
  retrieval_failure: { method: "retrieval_drill", route: "/review", minutes: 15, verb: "Re-test" },
  misconception: { method: "worked_example", route: "/weak-areas", minutes: 20, verb: "Unpick" },
  application_failure: { method: "guided_practice", route: "/practice", minutes: 25, verb: "Apply" },
  troubleshooting_failure: { method: "scenario", route: "/troubleshoot", minutes: 25, verb: "Work a fault on" },
  confident_but_wrong: { method: "explain_back", route: "/quiz-me", minutes: 20, verb: "Slow down on" },
  fading: { method: "retrieval_drill", route: "/review", minutes: 12, verb: "Refresh" },
  solid: { method: "retrieval_drill", route: "/review", minutes: 8, verb: "Maintain" },
};

/**
 * Difficulty steps up when the learner is accurate and quick, and down after
 * repeated failure, so material is never pitched above current ability.
 */
export function difficultyFor(profile: ConceptProfile, diagnosis: Diagnosis): DifficultyBand {
  if (diagnosis === "never_learned" || diagnosis === "prerequisite_gap") return "foundation";
  const fast = profile.avgResponseSeconds !== null && profile.avgResponseSeconds <= 30;
  if (profile.mastery >= 0.8 && profile.accuracy >= 0.8 && fast) return "advanced";
  if (profile.mastery >= 0.6 && profile.accuracy >= 0.6) return "core";
  return "foundation";
}

export function prescribe(profile: ConceptProfile, diagnosis: Diagnosis): Prescription {
  const base = BY_DIAGNOSIS[diagnosis];
  const difficulty = difficultyFor(profile, diagnosis);

  // Hands-on beats written practice once the learner can already apply the idea.
  let method = base.method;
  let route = base.route;
  if (diagnosis === "application_failure" && difficulty !== "foundation") {
    method = "hands_on";
    route = "/labs";
  }
  if (diagnosis === "misconception" && profile.errorPatterns.length >= 3) {
    method = "tutor";
    route = "/ai-tutor";
  }

  return {
    method,
    route,
    difficulty,
    instruction: `${base.verb} ${profile.title}`,
    estimatedMinutes: base.minutes,
  };
}
