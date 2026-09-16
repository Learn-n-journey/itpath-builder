/**
 * The mastery gate.
 *
 * A section is not passed by averaging. Each form of proof stands on its own,
 * and a strong score in one place cannot cover a weak one somewhere else:
 *
 *   Knowledge check      the section quiz, passed at 80 or better
 *   Recall               answering from memory with nothing in front of you
 *   Application          choosing the right move in a described situation
 *   Practical ability    doing the work yourself at a machine or terminal
 *   Troubleshooting      finding the cause of a fault
 *   Teach back           explaining it clearly in your own words
 *
 * Anything a section does not contain is simply not asked for.
 *
 * Once all of those are proven the next section opens and a delayed check is
 * scheduled for the following day. If that check is not passed, the next
 * section closes again until it is, and it is asked for again each day until
 * it is passed first time that day.
 */
import type { EntityId, UserData } from "@/lib/app-data/types";
import { topicEvidence, type EvidenceItem, type ScopeDimensionKey } from "@/lib/scope-progress";

const DAY = 24 * 60 * 60 * 1000;
const PASS = 80;
const dayOf = (time: number) => Math.floor(time / DAY);

export type CompetencyKey = "knowledge" | ScopeDimensionKey;

export interface Competency {
  key: CompetencyKey;
  label: string;
  /** What proving it looks like, in plain words. */
  requirement: string;
  /** False when the section contains no work of this kind. */
  required: boolean;
  met: boolean;
  /** Graded items of this kind in the section. */
  available: number;
  /** How many of them have been passed at 80 or better. */
  passed: number;
  /** How many still need a pass. */
  outstanding: number;
  /** Score on the attempts made, 0 when nothing has been attempted. */
  score: number;
  /** Where this stands, in plain words. */
  detail: string;
}

export interface DelayedCheck {
  /** True once every other form of proof is in. */
  scheduled: boolean;
  /** When the check can first be taken. */
  dueAt?: string;
  due: boolean;
  passed: boolean;
  detail: string;
}

export interface MasteryGate {
  topicId: EntityId;
  /** True when the section is proven and the next one may open. */
  met: boolean;
  competencies: Competency[];
  /** The forms of proof still outstanding, weakest first. */
  outstanding: Competency[];
  weakest?: Competency;
  delayed: DelayedCheck;
  /** One plain sentence for the learner. */
  summary: string;
}

const LABELS: Record<CompetencyKey, { label: string; requirement: string }> = {
  knowledge: {
    label: "Knowledge check",
    requirement: "Pass the section quiz at 80 or better.",
  },
  recall: {
    label: "Recall, no help",
    requirement: "Answer the recall questions from memory, with nothing in front of you.",
  },
  application: {
    label: "Application",
    requirement: "Pick the right move in a described situation.",
  },
  practicalAbility: {
    label: "Practical task",
    requirement: "Do the work yourself in a lab or at the terminal.",
  },
  troubleshooting: {
    label: "Troubleshooting",
    requirement: "Work a fault through to its cause.",
  },
  understanding: {
    label: "Teach back",
    requirement: "Explain the idea clearly in your own words.",
  },
};

function bestOf(item: EvidenceItem): number | undefined {
  if (!item.attempts.length) return undefined;
  if (item.reading === "latest") {
    const sorted = [...item.attempts].sort((a, b) => a.at - b.at);
    return sorted[sorted.length - 1]?.score;
  }
  return Math.max(...item.attempts.map((row) => row.score));
}

/** The first day this item was passed, if it ever has been. */
function firstPassDay(item: EvidenceItem): number | undefined {
  const passes = item.attempts.filter((row) => row.score >= PASS).sort((a, b) => a.at - b.at);
  return passes[0] ? dayOf(passes[0].at) : undefined;
}

/**
 * How much of a kind of work has to be passed. Recall is asked for in bulk
 * because one right answer is not memory; the rest need every item passed,
 * which is usually one or two things.
 */
function requiredCount(key: CompetencyKey, available: number): number {
  if (available === 0) return 0;
  if (key === "recall") return Math.max(1, Math.ceil(available * 0.8));
  return available;
}

function buildCompetency(
  key: CompetencyKey,
  items: EvidenceItem[],
): Competency {
  const { label, requirement } = LABELS[key];
  const available = items.length;
  const scores = items.map(bestOf);
  const attempted = scores.filter((value): value is number => value !== undefined);
  const passed = attempted.filter((value) => value >= PASS).length;
  const need = requiredCount(key, available);
  const met = available > 0 && passed >= need;
  const score = attempted.length
    ? Math.round(attempted.reduce((sum, value) => sum + value, 0) / attempted.length)
    : 0;

  let detail: string;
  if (available === 0) detail = "Not in this section.";
  else if (met) detail = `Proven, ${passed} of ${available} passed.`;
  else if (attempted.length === 0) detail = `Nothing recorded yet, ${need} to pass.`;
  else detail = `${passed} of ${need} passed so far.`;

  return {
    key,
    label,
    requirement,
    required: available > 0,
    met,
    available,
    passed,
    outstanding: Math.max(0, need - passed),
    score,
    detail,
  };
}

/** The section quiz, read as its own piece of proof. */
function knowledgeCompetency(user: UserData, topicId: EntityId): Competency {
  const quizId = `section-quiz-${topicId}`;
  const remembered = user.quizPasses?.[quizId];
  const best = user.quizAttempts
    .filter((attempt) => attempt.quizId === quizId && attempt.status === "submitted")
    .reduce((top, attempt) => Math.max(top, attempt.score ?? 0), remembered?.score ?? 0);
  const met = Boolean(remembered) || best >= PASS;
  const { label, requirement } = LABELS.knowledge;
  return {
    key: "knowledge",
    label,
    requirement,
    required: true,
    met,
    available: 1,
    passed: met ? 1 : 0,
    outstanding: met ? 0 : 1,
    score: Math.round(best),
    detail: met
      ? `Passed at ${Math.round(Math.max(best, remembered?.score ?? 0))}%.`
      : best > 0
        ? `Best so far ${Math.round(best)}%, 80% to pass.`
        : "Not taken yet.",
  };
}

/** The day the last outstanding piece of proof came in. */
function provenDay(user: UserData, topicId: EntityId, items: EvidenceItem[], quiz: Competency): number | undefined {
  if (!quiz.met) return undefined;
  const passedAt = user.quizPasses?.[`section-quiz-${topicId}`]?.passedAt;
  const quizDay = passedAt ? dayOf(new Date(passedAt).getTime()) : undefined;
  const days = items.map(firstPassDay).filter((value): value is number => value !== undefined);
  const all = quizDay === undefined ? days : [...days, quizDay];
  return all.length ? Math.max(...all) : undefined;
}

export function masteryGate(user: UserData, topicId: EntityId, now: Date = new Date()): MasteryGate {
  const evidence = topicEvidence(user, topicId);
  const byDimension = (dimension: ScopeDimensionKey) =>
    evidence.filter((item) => item.dimension === dimension);

  const quiz = knowledgeCompetency(user, topicId);
  // Recall is the no-help recall round. Quiz questions are graded under the
  // knowledge check, so they are not asked for twice here.
  const recallItems = byDimension("recall").filter((item) => item.id.startsWith("recall-"));
  const competencies: Competency[] = [
    quiz,
    buildCompetency("recall", recallItems),
    buildCompetency("understanding", byDimension("understanding")),
    buildCompetency("application", byDimension("application")),
    buildCompetency("practicalAbility", byDimension("practicalAbility")),
    buildCompetency("troubleshooting", byDimension("troubleshooting")),
  ];

  const required = competencies.filter((item) => item.required);
  const outstanding = required
    .filter((item) => !item.met)
    .sort((a, b) => a.score - b.score || b.outstanding - a.outstanding);
  const coreProven = outstanding.length === 0;

  // The delayed check: has any of this work held up on a later day.
  const proven = coreProven ? provenDay(user, topicId, evidence, quiz) : undefined;
  const todayDay = dayOf(now.getTime());
  const dueDay = proven === undefined ? undefined : proven + 1;
  const laterPass = evidence.some((item) =>
    item.attempts.some((row) => row.score >= PASS && proven !== undefined && dayOf(row.at) >= proven + 1),
  );
  const due = dueDay !== undefined && todayDay >= dueDay && !laterPass;

  const delayed: DelayedCheck = {
    scheduled: coreProven,
    dueAt: dueDay === undefined ? undefined : new Date(dueDay * DAY).toISOString(),
    due,
    passed: coreProven && laterPass,
    detail: !coreProven
      ? "Scheduled once the rest of this section is proven."
      : laterPass
        ? "Held up after a break. Nothing owed here."
        : due
          ? "Due now. Answer a recall round or retake the quiz to show it stuck."
          : "Scheduled for tomorrow, to check it stuck.",
  };

  const met = coreProven && !due;

  const weakest = outstanding[0];
  const summary = met
    ? delayed.passed
      ? "Proven across every part of this section, and it held up after a break."
      : "Proven across every part of this section. A short check tomorrow confirms it stuck."
    : due
      ? "The delayed check is due. Pass it and the next section opens again."
      : weakest
        ? `Still to prove: ${weakest.label.toLowerCase()}. ${weakest.requirement}`
        : "Still working through this section.";

  return { topicId, met, competencies, outstanding, weakest, delayed, summary };
}
