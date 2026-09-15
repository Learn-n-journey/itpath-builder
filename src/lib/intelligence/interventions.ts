/**
 * Intervention effectiveness.
 *
 * The engine does not assume its own advice works. Every teaching event the
 * learner records — a lesson opened, a lab worked, a tutor session, a review —
 * is treated as an intervention, and the graded results before and after it are
 * compared. A method that has not moved this learner's results is demoted in
 * favour of one that has.
 *
 * All of it is derived from the recorded signal stream, so it is reproducible
 * and needs no extra storage.
 */
import type { LearnerSignalKind } from "@/lib/app-data/types";
import type { GradedSignal } from "./evidence";
import type { TeachingMethod } from "./types";

const MS_DAY = 24 * 60 * 60 * 1000;
/** Results this long after a teaching event count as its outcome. */
const AFTER_WINDOW_DAYS = 14;
const BEFORE_WINDOW_DAYS = 21;

/** Which teaching method each recorded activity represents. */
export const METHOD_OF: Partial<Record<LearnerSignalKind, TeachingMethod>> = {
  lesson: "read",
  review: "retrieval_drill",
  recall: "retrieval_drill",
  practice: "guided_practice",
  scenario: "scenario",
  lab: "hands_on",
  terminal: "hands_on",
  troubleshoot: "scenario",
  career: "scenario",
  teach_back: "explain_back",
  ai_tutor: "tutor",
};

export interface InterventionRecord {
  method: TeachingMethod;
  at: string;
  /** Mean graded outcome in the 21 days before, 0-1. */
  before: number | null;
  /** Mean graded outcome in the 14 days after, 0-1. */
  after: number | null;
  /** after - before, in mastery points. Null when either side is missing. */
  delta: number | null;
  /** True when there is enough on both sides to judge it. */
  measurable: boolean;
}

export interface MethodEffect {
  method: TeachingMethod;
  uses: number;
  measured: number;
  /** Mean delta in points across measured uses. */
  meanDelta: number;
  helped: number;
  hurt: number;
}

export interface InterventionHistory {
  records: InterventionRecord[];
  byMethod: MethodEffect[];
  /** Methods with at least two measured uses and a negative mean delta. */
  ineffective: TeachingMethod[];
  /** Best measured method for this learner on this concept, if any. */
  bestMethod: TeachingMethod | null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Builds the intervention history for one concept from its graded signals plus
 * the teaching events around them.
 */
export function interventionHistory(
  graded: GradedSignal[],
  teachingEvents: Array<{ kind: LearnerSignalKind; atMs: number; at: string }>,
): InterventionHistory {
  const records: InterventionRecord[] = [];

  for (const event of teachingEvents) {
    const method = METHOD_OF[event.kind];
    if (!method) continue;

    const before = mean(
      graded
        .filter(
          (entry) =>
            entry.atMs < event.atMs && event.atMs - entry.atMs <= BEFORE_WINDOW_DAYS * MS_DAY,
        )
        .map((entry) => entry.outcome),
    );
    const after = mean(
      graded
        .filter(
          (entry) =>
            entry.atMs > event.atMs && entry.atMs - event.atMs <= AFTER_WINDOW_DAYS * MS_DAY,
        )
        .map((entry) => entry.outcome),
    );

    const measurable = before !== null && after !== null;
    records.push({
      method,
      at: event.at,
      before: before === null ? null : Number(before.toFixed(3)),
      after: after === null ? null : Number(after.toFixed(3)),
      delta: measurable ? Number(((after! - before!) * 100).toFixed(1)) : null,
      measurable,
    });
  }

  const grouped = new Map<TeachingMethod, InterventionRecord[]>();
  for (const record of records) {
    const list = grouped.get(record.method);
    if (list) list.push(record);
    else grouped.set(record.method, [record]);
  }

  const byMethod: MethodEffect[] = [...grouped.entries()].map(([method, list]) => {
    const measured = list.filter((record) => record.measurable);
    const deltas = measured.map((record) => record.delta!);
    return {
      method,
      uses: list.length,
      measured: measured.length,
      meanDelta: deltas.length === 0 ? 0 : Number((mean(deltas) ?? 0).toFixed(1)),
      helped: deltas.filter((delta) => delta > 3).length,
      hurt: deltas.filter((delta) => delta < -3).length,
    };
  });

  const ineffective = byMethod
    .filter((effect) => effect.measured >= 2 && effect.meanDelta <= 0)
    .map((effect) => effect.method);

  const best = byMethod
    .filter((effect) => effect.measured >= 2 && effect.meanDelta > 3)
    .sort((a, b) => b.meanDelta - a.meanDelta)[0];

  return {
    records: records.slice(-12),
    byMethod: byMethod.sort((a, b) => b.meanDelta - a.meanDelta),
    ineffective,
    bestMethod: best?.method ?? null,
  };
}
