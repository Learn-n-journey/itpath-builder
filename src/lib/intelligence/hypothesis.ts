/**
 * Hypothesis layer.
 *
 * A diagnosis is a claim about a cause, so it is treated as one: every
 * candidate cause is scored from named evidence, competing causes are kept
 * rather than discarded, and a claim is only "confirmed" when at least two
 * independent signals support it. When the leading claim is not confirmed, the
 * engine proposes a controlled diagnostic test that separates it from its
 * nearest rival instead of guessing.
 *
 * Nothing here is model-generated: the same inputs always produce the same
 * hypotheses.
 */
import type { TopicScopeProgress } from "@/lib/scope-progress";
import type { ConceptProfile } from "@/lib/learner-model";
import type { EvidenceStrength, TransferEvidence } from "./evidence";
import type { Measures } from "./diagnose";
import type { ActivityRoute, Diagnosis } from "./types";

export type HypothesisStatus = "confirmed" | "likely" | "tentative";

export interface Hypothesis {
  diagnosis: Diagnosis;
  /** 0-1 support from the evidence below. */
  confidence: number;
  status: HypothesisStatus;
  /** Independent signals supporting the claim. */
  support: number;
  /** Named evidence, each traceable to a recorded fact. */
  because: string[];
}

export interface DiagnosticTest {
  /** What the test would settle. */
  question: string;
  route: ActivityRoute;
  /** Plain instruction for the learner. */
  instruction: string;
  minutes: number;
  /** The rival hypotheses it separates. */
  separates: [Diagnosis, Diagnosis];
}

export interface HypothesisSet {
  leading: Hypothesis;
  alternatives: Hypothesis[];
  /** Overall trust in the leading claim, 0-1. */
  certainty: number;
  /** Present when the leading claim is not yet confirmed. */
  test: DiagnosticTest | null;
}

export interface HypothesisInput {
  profile: ConceptProfile;
  scope: TopicScopeProgress;
  measures: Measures;
  evidence: EvidenceStrength;
  transfer: TransferEvidence;
  unresolvedMistakes: number;
  repeatedMisconception: boolean;
  prerequisiteGap: boolean;
}

interface Candidate {
  diagnosis: Diagnosis;
  weight: number;
  support: number;
  because: string[];
}

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

/** Minimum recorded history before decay can be claimed rather than assumed. */
export const FADING_MIN_GRADED = 4;
export const FADING_MIN_CORRECT = 2;
export const FADING_MIN_DAYS_RECORDED = 2;
export const FADING_MIN_DAYS_SINCE = 7;

/**
 * True only when there is enough recorded work for recall to have measurably
 * faded: several graded results, more than one of them correct, recorded on
 * separate days, and enough time since the last one for forgetting to apply.
 */
export function hasFadingHistory(input: HypothesisInput): boolean {
  const { profile, evidence } = input;
  if (profile.daysSinceExposure === null) return false;
  return (
    evidence.gradedSignals >= FADING_MIN_GRADED &&
    profile.correct >= FADING_MIN_CORRECT &&
    evidence.distinctDays >= FADING_MIN_DAYS_RECORDED &&
    profile.daysSinceExposure >= FADING_MIN_DAYS_SINCE
  );
}

/** Builds every candidate cause the recorded evidence can support. */
function candidates(input: HypothesisInput): Candidate[] {
  const { profile, scope, measures, evidence, transfer, unresolvedMistakes } = input;
  const out: Candidate[] = [];

  if (evidence.gradedSignals === 0 && scope.attempted === 0) {
    out.push({
      diagnosis: "never_learned",
      weight: 1,
      support: 1,
      because: ["No graded work recorded on this concept."],
    });
    return out;
  }

  if (input.prerequisiteGap) {
    const gaps = profile.prerequisites.filter((prerequisite) => !prerequisite.satisfied);
    const weakest = gaps.sort((a, b) => a.mastery - b.mastery)[0];
    out.push({
      diagnosis: "prerequisite_gap",
      weight: profile.mastery < 0.6 ? 0.85 : 0.45,
      support: 1 + (profile.mastery < 0.5 ? 1 : 0),
      because: [
        weakest
          ? `${weakest.title} sits at ${pct(weakest.mastery * 100)} and this builds on it.`
          : "A prerequisite concept is still unproven.",
        `Mastery here is ${pct(profile.mastery * 100)}.`,
      ],
    });
  }

  if (measures.confidentErrors > 0) {
    out.push({
      diagnosis: "confident_but_wrong",
      weight: measures.confidentErrors >= 2 ? 0.9 : 0.5,
      support: measures.confidentErrors,
      because: [
        `${measures.confidentErrors} fast answer(s) were wrong after this had been answered correctly.`,
      ],
    });
  }

  if (input.repeatedMisconception) {
    const pattern = profile.errorPatterns.find((entry) => entry.count >= 2);
    out.push({
      diagnosis: "misconception",
      weight: 0.88,
      support: pattern ? pattern.count : 2,
      because: [
        pattern
          ? `The same error appeared ${pattern.count} times: ${pattern.label.toLowerCase()}.`
          : "The same error keeps reappearing across attempts.",
        unresolvedMistakes > 0 ? `${unresolvedMistakes} mistake(s) on it are unresolved.` : "",
      ].filter(Boolean),
    });
  }

  if (measures.recentFailureAfterSuccess) {
    out.push({
      diagnosis: "retrieval_failure",
      weight: profile.mastery < 0.75 ? 0.8 : 0.5,
      support: 1 + (profile.retention < 0.6 ? 1 : 0),
      because: [
        "A concept previously answered correctly was missed again in the last 30 days.",
        `Estimated recall today is ${pct(profile.retention * 100)}.`,
      ],
    });
  }

  const knows = (scope.understanding.score + scope.recall.score) / 2;
  if (knows >= 55 && scope.practicalAbility.score < 40) {
    out.push({
      diagnosis: "application_failure",
      weight: 0.72,
      support: 1 + (transfer.attemptedContexts > 0 && transfer.score < 0.5 ? 1 : 0),
      because: [
        `Knowledge scores average ${pct(knows)} while applied work sits at ${pct(scope.practicalAbility.score)}.`,
        transfer.attemptedContexts > 0
          ? `Applied attempts pass ${pct(transfer.score * 100)} of the time.`
          : "No applied or hands-on work recorded yet.",
      ],
    });
  }

  if (knows >= 55 && scope.troubleshooting.score < 35) {
    out.push({
      diagnosis: "troubleshooting_failure",
      weight: 0.68,
      support: scope.troubleshooting.attempted > 0 ? 2 : 1,
      because: [
        `Fault-finding work scores ${pct(scope.troubleshooting.score)} against knowledge at ${pct(knows)}.`,
      ],
    });
  }

  // Fading is a claim that something known has since decayed, so it needs a
  // recorded history to decay from: several graded results, at least two of
  // them right, spread over more than one day, and real time since the last
  // one. Without that, a low recall number only means it was never proven.
  if (profile.retention < 0.55 && hasFadingHistory(input)) {
    const days = profile.daysSinceExposure ?? 0;
    out.push({
      diagnosis: "fading",
      weight: 0.6,
      support: days > 14 ? 2 : 1,
      because: [
        `Estimated recall has dropped to ${pct(profile.retention * 100)}.`,
        `${profile.correct} correct result(s) recorded here across ${evidence.distinctDays} separate day(s).`,
        `Last worked ${Math.round(days)} day(s) ago.`,
      ],
    });
  }

  if (profile.mastery < 0.6 && out.length === 0) {
    out.push({
      diagnosis: "application_failure",
      weight: 0.4,
      support: 1,
      because: [`Overall mastery against everything available is ${pct(profile.mastery * 100)}.`],
    });
  }

  if (out.length === 0) {
    out.push({
      diagnosis: "solid",
      weight: 0.7,
      support: Math.max(1, evidence.independentSources),
      because: [
        `${pct(profile.mastery * 100)} mastery with ${evidence.gradedSignals} graded result(s) across ${evidence.independentSources} activity type(s).`,
      ],
    });
  }

  return out;
}

/** Pairs a leading claim with the test that would separate it from its rival. */
function testFor(leading: Diagnosis, rival: Diagnosis | null): DiagnosticTest | null {
  const pair: [Diagnosis, Diagnosis] = [leading, rival ?? leading];
  switch (leading) {
    case "retrieval_failure":
      return {
        question: "Is the idea missing, or just hard to retrieve on demand?",
        route: "/review",
        instruction: "Answer a short timed retrieval set on this concept with no lesson first.",
        minutes: 8,
        separates: pair,
      };
    case "misconception":
      return {
        question: "Is the same wrong rule being applied, or were these unrelated slips?",
        route: "/quiz-me",
        instruction: "Answer a focused question set built around the repeated error.",
        minutes: 10,
        separates: pair,
      };
    case "application_failure":
      return {
        question: "Does the knowledge fail, or only its use in real work?",
        route: "/practice",
        instruction: "Work one written task on this concept before any further reading.",
        minutes: 12,
        separates: pair,
      };
    case "troubleshooting_failure":
      return {
        question: "Are the facts wrong, or is the fault-finding order wrong?",
        route: "/troubleshoot",
        instruction: "Work one incident on this concept and record each step.",
        minutes: 15,
        separates: pair,
      };
    case "prerequisite_gap":
      return {
        question: "Is the gap here, or in what this concept builds on?",
        route: "/quiz-me",
        instruction: "Answer a short set on the prerequisite concept before returning.",
        minutes: 10,
        separates: pair,
      };
    case "confident_but_wrong":
      return {
        question: "Is the speed the problem, or the understanding?",
        route: "/quiz-me",
        instruction: "Answer a short set on this concept and explain each choice before moving on.",
        minutes: 10,
        separates: pair,
      };
    case "fading":
      return {
        question: "Has it actually faded, or is the estimate stale?",
        route: "/review",
        instruction: "Clear the due review on this concept to confirm what still comes back.",
        minutes: 8,
        separates: pair,
      };
    case "never_learned":
    case "solid":
      return null;
  }
}

const CONFIRMED_SUPPORT = 2;

export function hypothesize(input: HypothesisInput): HypothesisSet {
  const scored = candidates(input)
    .map((candidate) => {
      // Breadth of evidence raises trust; a single source caps it.
      const breadth = Math.min(1, 0.55 + input.evidence.independentSources * 0.15);
      const confidence = Number(Math.min(1, candidate.weight * breadth).toFixed(3));
      const status: HypothesisStatus =
        candidate.support >= CONFIRMED_SUPPORT && input.evidence.independentSources >= 2
          ? "confirmed"
          : confidence >= 0.6
            ? "likely"
            : "tentative";
      return {
        diagnosis: candidate.diagnosis,
        confidence,
        status,
        support: candidate.support,
        because: candidate.because,
      } satisfies Hypothesis;
    })
    .sort((a, b) => b.confidence - a.confidence || b.support - a.support);

  const leading = scored[0]!;
  const alternatives = scored.slice(1, 3);
  const rival = alternatives[0]?.diagnosis ?? null;

  // Certainty falls when a rival is nearly as well supported.
  const margin = alternatives[0] ? leading.confidence - alternatives[0].confidence : leading.confidence;
  const certainty = Number(
    Math.max(0, Math.min(1, leading.confidence * 0.7 + Math.min(margin, 0.3) * 1)).toFixed(3),
  );

  return {
    leading,
    alternatives,
    certainty,
    test: leading.status === "confirmed" ? null : testFor(leading.diagnosis, rival),
  };
}
