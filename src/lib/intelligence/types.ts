/**
 * Learning Intelligence Engine — shared types.
 *
 * One model per concept, derived from recorded work only. Nothing is assumed:
 * a concept with no evidence is "never_learned", not "weak".
 */
import type { EntityId } from "@/lib/app-data/types";

export type Diagnosis =
  | "never_learned"
  | "prerequisite_gap"
  | "retrieval_failure"
  | "misconception"
  | "application_failure"
  | "troubleshooting_failure"
  | "confident_but_wrong"
  | "fading"
  | "solid";

export type TeachingMethod =
  | "read"
  | "worked_example"
  | "guided_practice"
  | "retrieval_drill"
  | "scenario"
  | "hands_on"
  | "explain_back"
  | "tutor";

export type DifficultyBand = "foundation" | "core" | "advanced";

export type ActivityRoute =
  | "/topics/$topicId"
  | "/learn"
  | "/practice"
  | "/quiz-me"
  | "/labs"
  | "/troubleshoot"
  | "/career-mode"
  | "/command-line"
  | "/review"
  | "/weak-areas"
  | "/ai-tutor";

export interface ConceptIntel {
  topicId: EntityId;
  title: string;
  certificationId: EntityId;
  /** 0-1, measured against everything available for the topic. */
  mastery: number;
  /** 0-1 trust in the mastery number, from how much evidence exists. */
  confidence: number;
  /** 0-1 chance it is still retrievable today. */
  retention: number;
  /** 1 - retention, weighted by how much there is to lose. */
  forgettingRisk: number;
  accuracy: number;
  attempts: number;
  avgResponseSeconds: number | null;
  /** Mastery points gained per recorded hour of study on this topic. */
  efficiency: number | null;
  /** Fast, assured, wrong answers on material previously answered correctly. */
  confidentErrors: number;
  misconceptions: string[];
  unresolvedMistakes: number;
  prerequisiteGaps: Array<{ topicId: EntityId; title: string; mastery: number }>;
  diagnosis: Diagnosis;
  method: TeachingMethod;
  difficulty: DifficultyBand;
  route: ActivityRoute;
  /** Plain sentence naming the evidence behind the diagnosis. */
  evidence: string;
  /** What to do, as an instruction. */
  instruction: string;
  estimatedMinutes: number;
  /** ISO date this concept should be revisited. */
  nextReviewAt: string;
  daysOverdue: number;
  /** Higher means study sooner. */
  priority: number;
  onTargetPath: boolean;
}

export interface PlanItem extends ConceptIntel {
  minutes: number;
}

export interface LearningPlan {
  targetMinutes: number;
  plannedMinutes: number;
  items: PlanItem[];
}

export interface Intelligence {
  generatedAt: string;
  certificationId: EntityId;
  certificationTitle: string;
  concepts: ConceptIntel[];
  byTopic: Record<EntityId, ConceptIntel>;
  /** Ranked, interleaved, target-certification-first work queue. */
  queue: ConceptIntel[];
  /** How many concepts carry each diagnosis. */
  diagnosisMix: Record<Diagnosis, number>;
  hasEvidence: boolean;
  planFor: (minutes: number) => LearningPlan;
}

export const DIAGNOSIS_LABEL: Record<Diagnosis, string> = {
  never_learned: "Not started",
  prerequisite_gap: "Prerequisite gap",
  retrieval_failure: "Retrieval failure",
  misconception: "Misconception",
  application_failure: "Can explain it, can't apply it",
  troubleshooting_failure: "Weak fault process",
  confident_but_wrong: "Confident but wrong",
  fading: "Fading",
  solid: "Solid",
};

export const METHOD_LABEL: Record<TeachingMethod, string> = {
  read: "Read the lesson",
  worked_example: "Study a worked example",
  guided_practice: "Guided practice",
  retrieval_drill: "Retrieval drill",
  scenario: "Real-world scenario",
  hands_on: "Hands-on work",
  explain_back: "Explain it back",
  tutor: "Ask the AI tutor",
};
