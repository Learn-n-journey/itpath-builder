/**
 * Prescription layer: diagnosis -> teaching method, difficulty and activity.
 *
 * Two deterministic adjustments sit on top of the base mapping:
 *  1. When the leading diagnosis is not yet confirmed, the prescription becomes
 *     the controlled diagnostic test instead of a treatment.
 *  2. When a method has measurably failed to move this learner's results on
 *     this concept, it is replaced by one that has.
 */
import type { ConceptProfile } from "@/lib/learner-model";
import type { DiagnosticTest } from "./hypothesis";
import type { InterventionHistory } from "./interventions";
import type { LearningState } from "./states";
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
  /** True when this is a diagnostic test rather than a treatment. */
  isDiagnostic: boolean;
  /** Why this method was chosen over the default one, when it differs. */
  methodReason: string | null;
}

const BY_DIAGNOSIS: Record<
  Diagnosis,
  { method: TeachingMethod; route: ActivityRoute; minutes: number; verb: string }
> = {
  never_learned: { method: "read", route: "/topics/$topicId", minutes: 35, verb: "Start" },
  prerequisite_gap: { method: "read", route: "/topics/$topicId", minutes: 30, verb: "Go back to" },
  retrieval_failure: { method: "retrieval_drill", route: "/review", minutes: 15, verb: "Re-test" },
  misconception: { method: "worked_example", route: "/weak-areas", minutes: 20, verb: "Clear up" },
  application_failure: { method: "guided_practice", route: "/practice", minutes: 25, verb: "Apply" },
  troubleshooting_failure: { method: "scenario", route: "/troubleshoot", minutes: 25, verb: "Work a fault on" },
  confident_but_wrong: { method: "explain_back", route: "/quiz-me", minutes: 20, verb: "Slow down on" },
  fading: { method: "retrieval_drill", route: "/review", minutes: 12, verb: "Refresh" },
  solid: { method: "retrieval_drill", route: "/review", minutes: 8, verb: "Maintain" },
};

/** Where each teaching method is carried out. */
export const ROUTE_OF_METHOD: Record<TeachingMethod, ActivityRoute> = {
  read: "/topics/$topicId",
  worked_example: "/weak-areas",
  guided_practice: "/practice",
  retrieval_drill: "/review",
  scenario: "/troubleshoot",
  hands_on: "/labs",
  explain_back: "/quiz-me",
  tutor: "/ai-tutor",
};

export interface PrescribeOptions {
  state?: LearningState;
  interventions?: InterventionHistory;
  diagnosticTest?: DiagnosticTest | null;
  /** 0-1 trust in the leading diagnosis. */
  certainty?: number;
}

/**
 * Difficulty steps up when the learner is accurate over enough recorded work,
 * and down after repeated failure, so material is never pitched above current
 * ability. The learning state acts as a ceiling: nothing fragile is set at
 * advanced. Speed is deliberately not a condition, because rewarding quick
 * answers encourages rushing, which is the very habit the engine flags.
 */
export function difficultyFor(
  profile: ConceptProfile,
  diagnosis: Diagnosis,
  state?: LearningState,
): DifficultyBand {
  if (diagnosis === "never_learned" || diagnosis === "prerequisite_gap") return "foundation";
  if (state === "unknown" || state === "emerging") return "foundation";

  const enoughWork = profile.attempts >= 6;
  let band: DifficultyBand = "foundation";
  if (profile.mastery >= 0.8 && profile.accuracy >= 0.8 && enoughWork) band = "advanced";
  else if (profile.mastery >= 0.6 && profile.accuracy >= 0.6) band = "core";

  // A fragile concept is never pitched above core, whatever the averages say.
  if (state === "fragile" && band === "advanced") return "core";
  return band;
}

export function prescribe(
  profile: ConceptProfile,
  diagnosis: Diagnosis,
  options: PrescribeOptions = {},
): Prescription {
  const base = BY_DIAGNOSIS[diagnosis];
  const difficulty = difficultyFor(profile, diagnosis, options.state);

  let method = base.method;
  let route = base.route;
  let minutes = base.minutes;
  let instruction = `${base.verb} ${profile.title}`;
  let methodReason: string | null = null;
  let isDiagnostic = false;

  // Hands-on beats written practice once the learner can already apply the idea.
  if (diagnosis === "application_failure" && difficulty !== "foundation") {
    method = "hands_on";
    route = "/labs";
  }
  if (diagnosis === "misconception" && profile.errorPatterns.length >= 3) {
    method = "tutor";
    route = "/ai-tutor";
  }

  // A method this learner has tried twice without improvement is replaced.
  const history = options.interventions;
  if (history && history.ineffective.includes(method) && history.bestMethod && history.bestMethod !== method) {
    const failed = history.byMethod.find((effect) => effect.method === method);
    methodReason = failed
      ? `${method.replace(/_/g, " ")} moved results by ${failed.meanDelta} points here, so this switches to what has worked.`
      : "Switched to the method that has actually moved results on this concept.";
    method = history.bestMethod;
    route = ROUTE_OF_METHOD[method];
  }

  // An unconfirmed diagnosis earns a test, not a treatment.
  const test = options.diagnosticTest;
  if (test && (options.certainty ?? 1) < 0.6) {
    isDiagnostic = true;
    route = test.route;
    minutes = test.minutes;
    instruction = test.instruction;
    methodReason = `The cause is not yet confirmed, so this checks it first: ${test.question}`;
  }

  return { method, route, difficulty, instruction, estimatedMinutes: minutes, isDiagnostic, methodReason };
}
