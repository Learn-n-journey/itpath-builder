/**
 * Evidence layer.
 *
 * Deterministic. Nothing here calls a model: it counts what the learner
 * actually did, how independent those signals are, how far apart in time they
 * sit, and whether the concept has ever been demonstrated outside the context
 * it was learned in.
 *
 * "Independent" means a different kind of activity, not another attempt at the
 * same one. Ten quiz questions are one source; a quiz plus a lab plus a written
 * scenario are three, and only that kind of spread justifies a strong claim.
 */
import type { LearnerSignal, LearnerSignalKind } from "@/lib/app-data/types";

const MS_DAY = 24 * 60 * 60 * 1000;

export type EvidenceLevel = "none" | "weak" | "moderate" | "strong";

/** Activity families. Transfer means succeeding in a family other than recall. */
export const CONTEXT_OF: Record<LearnerSignalKind, "knowledge" | "applied" | "performance"> = {
  lesson: "knowledge",
  recall: "knowledge",
  quiz: "knowledge",
  review: "knowledge",
  knowledge: "knowledge",
  ai_tutor: "knowledge",
  teach_back: "applied",
  practice: "applied",
  scenario: "applied",
  assignment: "applied",
  ai_grading: "applied",
  lab: "performance",
  troubleshoot: "performance",
  career: "performance",
  terminal: "performance",
};

export interface EvidenceStrength {
  level: EvidenceLevel;
  /** 0-1 composite of breadth, volume and spacing. */
  score: number;
  /** Distinct activity kinds that produced a graded result. */
  sources: LearnerSignalKind[];
  independentSources: number;
  gradedSignals: number;
  /** Graded results in the last 30 days. */
  recentSignals: number;
  /** Distinct calendar days that carry graded evidence. */
  distinctDays: number;
  /** Days between the first and last graded result. */
  spanDays: number;
}

export interface TransferEvidence {
  /** 0-1 success rate outside pure recall. */
  score: number;
  /** Distinct non-recall contexts with at least one success. */
  provenContexts: number;
  attemptedContexts: number;
  /** True once the concept has held up in two different non-recall contexts. */
  demonstrated: boolean;
}

export interface GradedSignal {
  signal: LearnerSignal;
  outcome: number;
  atMs: number;
}

export function gradedOutcome(signal: LearnerSignal): number | null {
  if (typeof signal.score === "number") return signal.score;
  if (typeof signal.correct === "boolean") return signal.correct ? 1 : 0;
  return null;
}

/** Graded signals only, oldest first. Exposure-only events carry no outcome. */
export function gradedSignals(signals: LearnerSignal[]): GradedSignal[] {
  return signals
    .map((signal) => {
      const outcome = gradedOutcome(signal);
      return outcome === null
        ? null
        : { signal, outcome, atMs: new Date(signal.at).getTime() };
    })
    .filter((entry): entry is GradedSignal => entry !== null)
    .sort((a, b) => a.atMs - b.atMs);
}

function levelFor(score: number, graded: number): EvidenceLevel {
  if (graded === 0) return "none";
  if (score < 0.35) return "weak";
  if (score < 0.7) return "moderate";
  return "strong";
}

export function evidenceStrength(graded: GradedSignal[], nowMs: number): EvidenceStrength {
  const sources = [...new Set(graded.map((entry) => entry.signal.kind))];
  const days = new Set(graded.map((entry) => new Date(entry.signal.at).toISOString().slice(0, 10)));
  const recent = graded.filter((entry) => nowMs - entry.atMs <= 30 * MS_DAY).length;
  const first = graded[0];
  const last = graded[graded.length - 1];
  const spanDays = first && last ? Math.round((last.atMs - first.atMs) / MS_DAY) : 0;

  // Breadth counts most: one activity repeated is one point of view.
  const breadth = Math.min(sources.length / 3, 1);
  const volume = Math.min(graded.length / 8, 1);
  const spacing = Math.min(days.size / 3, 1);
  const score = graded.length === 0 ? 0 : breadth * 0.4 + volume * 0.35 + spacing * 0.25;

  return {
    level: levelFor(score, graded.length),
    score: Number(score.toFixed(3)),
    sources,
    independentSources: sources.length,
    gradedSignals: graded.length,
    recentSignals: recent,
    distinctDays: days.size,
    spanDays,
  };
}

/**
 * Transfer: can the learner use the concept somewhere other than a recall
 * question? Measured only from applied and performance activities.
 */
export function transferEvidence(graded: GradedSignal[]): TransferEvidence {
  const outside = graded.filter((entry) => CONTEXT_OF[entry.signal.kind] !== "knowledge");
  if (outside.length === 0) {
    return { score: 0, provenContexts: 0, attemptedContexts: 0, demonstrated: false };
  }

  const attempted = new Set<string>();
  const proven = new Set<string>();
  let passed = 0;
  for (const entry of outside) {
    const context = `${CONTEXT_OF[entry.signal.kind]}:${entry.signal.kind}`;
    attempted.add(context);
    if (entry.outcome >= 0.7) {
      proven.add(context);
      passed += 1;
    }
  }

  return {
    score: Number((passed / outside.length).toFixed(3)),
    provenContexts: proven.size,
    attemptedContexts: attempted.size,
    demonstrated: proven.size >= 2,
  };
}

/** Mastery points gained per week from the recorded outcome trend. */
export function velocityFrom(graded: GradedSignal[], nowMs: number): number {
  const window = graded.filter((entry) => nowMs - entry.atMs <= 28 * MS_DAY);
  if (window.length < 4) return 0;
  const half = Math.floor(window.length / 2);
  const mean = (list: GradedSignal[]) =>
    list.reduce((sum, entry) => sum + entry.outcome, 0) / Math.max(1, list.length);
  const earlier = mean(window.slice(0, half));
  const later = mean(window.slice(half));
  const spanWeeks = Math.max(1, (window[window.length - 1]!.atMs - window[0]!.atMs) / (7 * MS_DAY));
  return Number((((later - earlier) * 100) / spanWeeks).toFixed(1));
}
