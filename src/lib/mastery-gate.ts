/**
 * The mastery gate.
 *
 * A section opens the next one on one thing only:
 *
 *   Knowledge check      the 20-question topic quiz, passed at 80 or better
 *
 * Everything else a topic offers — the try-it practice, recall prompts, the
 * teach-back brief, the real-world scenario and the hands-on lab — is practice.
 * It is there whenever the learner wants it and never stands between sections.
 */
import type { EntityId, UserData } from "@/lib/app-data/types";
import { topicEvidence, type EvidenceItem, type ScopeDimensionKey } from "@/lib/scope-progress";

const PASS = 80;

export type CompetencyKey = "knowledge" | ScopeDimensionKey;

export interface Competency {
  key: CompetencyKey;
  label: string;
  /** What proving it looks like, in plain words. */
  requirement: string;
  /** False when the section contains no work of this kind, or when it is extra practice. */
  required: boolean;
  /** True for work that is offered but never stands between sections. */
  optional: boolean;
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

export interface MasteryGate {
  topicId: EntityId;
  /** True when the section is proven and the next one may open. */
  met: boolean;
  competencies: Competency[];
  /** The forms of proof still outstanding, weakest first. */
  outstanding: Competency[];
  weakest?: Competency | undefined;
  /** One plain sentence for the learner. */
  summary: string;
}

const LABELS: Record<CompetencyKey, { label: string; requirement: string }> = {
  knowledge: {
    label: "Topic quiz",
    requirement: "Pass the 20-question topic quiz at 80 or better.",
  },
  recall: {
    label: "Recall practice",
    requirement: "Answer from memory. Practice only.",
  },
  application: {
    label: "Real-world scenario",
    requirement: "Work through the scenario. Practice only.",
  },
  practicalAbility: {
    label: "Lab (optional)",
    requirement: "Hands-on practice. Good for you, never needed to move on.",
  },
  troubleshooting: {
    label: "Troubleshooting practice",
    requirement: "Work a fault through to its cause. Practice only.",
  },
  understanding: {
    label: "Teach back",
    requirement: "Explain the idea in your own words. Practice only.",
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

function buildCompetency(key: CompetencyKey, items: EvidenceItem[]): Competency {
  const { label, requirement } = LABELS[key];
  const available = items.length;
  const scores = items.map(bestOf);
  const attempted = scores.filter((value): value is number => value !== undefined);
  const passed = attempted.filter((value) => value >= PASS).length;
  const met = available > 0 && passed >= available;
  const score = attempted.length
    ? Math.round(attempted.reduce((sum, value) => sum + value, 0) / attempted.length)
    : 0;

  return {
    key,
    label,
    requirement,
    required: false,
    optional: true,
    met,
    available,
    passed,
    outstanding: Math.max(0, available - passed),
    score,
    detail:
      available === 0
        ? "Not in this section."
        : met
          ? `Done, ${passed} of ${available} passed.`
          : "Open whenever you want the hands-on practice.",
  };
}

/** The topic quiz, the one thing that opens the next section. */
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
    optional: false,
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

export function masteryGate(user: UserData, topicId: EntityId, _now: Date = new Date()): MasteryGate {
  const evidence = topicEvidence(user, topicId);
  const practical = evidence.filter((item) => item.dimension === "practicalAbility");

  const quiz = knowledgeCompetency(user, topicId);
  const competencies: Competency[] = [quiz, buildCompetency("practicalAbility", practical)];

  const required = competencies.filter((item) => item.required);
  const outstanding = required.filter((item) => !item.met);
  const met = outstanding.length === 0;
  const weakest = outstanding[0];

  return {
    topicId,
    met,
    competencies,
    outstanding,
    weakest,
    summary: met
      ? "Topic quiz passed. The next section is open."
      : "Pass the 20-question topic quiz at 80 or better to open the next section.",
  };
}
