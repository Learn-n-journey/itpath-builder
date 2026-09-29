/**
 * Progressive learning states.
 *
 * Unknown → Emerging → Fragile → Functional → Transferable → Reliable → Retained
 *
 * A state is a gate, not a score: every rung has explicit conditions, and a
 * concept only holds a rung while all of that rung's conditions are still met.
 * Strong rungs need independent evidence, so one lucky quiz can never lift a
 * concept past "emerging".
 */
import type { EvidenceStrength, TransferEvidence } from "./evidence";

export type LearningState =
  | "unknown"
  | "emerging"
  | "fragile"
  | "functional"
  | "transferable"
  | "reliable"
  | "retained";

export const STATE_ORDER: LearningState[] = [
  "unknown",
  "emerging",
  "fragile",
  "functional",
  "transferable",
  "reliable",
  "retained",
];

export const STATE_LABEL: Record<LearningState, string> = {
  unknown: "Unknown",
  emerging: "Emerging",
  fragile: "Fragile",
  functional: "Functional",
  transferable: "Transferable",
  reliable: "Reliable",
  retained: "Retained",
};

export const STATE_MEANING: Record<LearningState, string> = {
  unknown: "No recorded work yet, so nothing is known either way.",
  emerging: "First attempts recorded, but not enough to say it is understood.",
  fragile: "It comes back sometimes and not others.",
  functional: "It holds up consistently in questions about the topic.",
  transferable: "It holds up in two different kinds of work, not just questions.",
  reliable: "Accurate across independent activities with no repeating error.",
  retained: "Still accurate weeks later without re-teaching.",
};

export interface StateInput {
  mastery: number;
  accuracy: number;
  retention: number;
  evidence: EvidenceStrength;
  transfer: TransferEvidence;
  recentFailureAfterSuccess: boolean;
  unresolvedMisconception: boolean;
  /** Days between the first and most recent passing result. */
  passSpanDays: number;
  daysSinceExposure: number | null;
  /** Successful graded work completed without simulator/GAYL assistance. */
  independentPasses: number;
  /** Distinct activity kinds with an independent passing result. */
  independentPassKinds: number;
  /** Independent passing evidence after the concept had already been proven earlier. */
  delayedIndependentPass: boolean;
}

export interface StateAssessment {
  state: LearningState;
  /** The rung it failed to reach, and why, in one sentence. */
  blockedBy: string | null;
}

/** Each rung's conditions, checked in order. The last rung that passes wins. */
export function assessState(input: StateInput): StateAssessment {
  const {
    mastery,
    accuracy,
    retention,
    evidence,
    transfer,
    recentFailureAfterSuccess,
    unresolvedMisconception,
    passSpanDays,
    daysSinceExposure,
    independentPasses,
    independentPassKinds,
    delayedIndependentPass,
  } = input;

  if (evidence.gradedSignals === 0) {
    return { state: "unknown", blockedBy: "No graded work recorded yet." };
  }

  if (mastery < 0.4 || accuracy < 0.5 || evidence.level === "weak") {
    return {
      state: "emerging",
      blockedBy:
        evidence.level === "weak"
          ? "Too little independent evidence to call it more than emerging."
          : "Accuracy is still below half on the recorded work.",
    };
  }

  const steady = !recentFailureAfterSuccess && retention >= 0.6 && accuracy >= 0.65;
  if (!steady || mastery < 0.55 || evidence.independentSources < 2) {
    return {
      state: "fragile",
      blockedBy: recentFailureAfterSuccess
        ? "It was answered correctly before and missed again since."
        : retention < 0.6
          ? "Recall has decayed since the last time it was used."
          : evidence.independentSources < 2
            ? "Only one kind of activity has tested it so far."
            : "Results still swing between right and wrong.",
    };
  }

  if (!transfer.demonstrated || independentPassKinds < 2) {
    return {
      state: "functional",
      blockedBy:
        transfer.attemptedContexts === 0
          ? "It has only been tested by questions, never applied."
          : independentPassKinds < 2
            ? "Transfer needs independent success in two different kinds of work."
            : "Applied or hands-on work on it has not held up twice yet.",
    };
  }

  if (accuracy < 0.8 || mastery < 0.75 || evidence.level !== "strong" || unresolvedMisconception || independentPasses < 3) {
    return {
      state: "transferable",
      blockedBy: unresolvedMisconception
        ? "A repeating error on this is still unresolved."
        : independentPasses < 3
          ? "Reliable requires repeated independent success, not assisted completion."
          : evidence.level !== "strong"
            ? "Evidence is not yet broad enough to call it reliable."
            : "Accuracy is not yet consistently high.",
    };
  }

  const held = passSpanDays >= 21 && retention >= 0.8 && delayedIndependentPass && (daysSinceExposure ?? 0) <= 45;
  if (!held) {
    return {
      state: "reliable",
      blockedBy:
        passSpanDays < 21
          ? "Not yet proven over a long enough stretch of time to call it retained."
          : !delayedIndependentPass
            ? "Retention needs an independent passing result again after the delay."
            : "Recall needs to be confirmed again after the current gap.",
    };
  }

  return { state: "retained", blockedBy: null };
}

export function stateRank(state: LearningState): number {
  return STATE_ORDER.indexOf(state);
}
