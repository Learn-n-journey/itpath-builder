/**
 * Learning Intelligence Engine, shared types.
 *
 * One model per concept, derived from recorded work only. Nothing is assumed:
 * a concept with no evidence is "never_learned", not "weak".
 */
import type { EntityId } from "@/lib/app-data/types";
import type { EvidenceStrength, TransferEvidence } from "./evidence";
import type { DiagnosticTest, Hypothesis } from "./hypothesis";
import type { InterventionHistory } from "./interventions";
import type { LearningState } from "./states";

/**
 * The deterministic cycle each concept is run through. Every recommendation
 * records one step per stage so it can be traced back to the evidence.
 */
export type CycleStage =
  | "observe"
  | "diagnose"
  | "hypothesize"
  | "intervene"
  | "retest"
  | "transfer"
  | "update"
  | "adapt";

export interface TraceStep {
  stage: CycleStage;
  detail: string;
}

export const STAGE_LABEL: Record<CycleStage, string> = {
  observe: "Observed",
  diagnose: "Diagnosed",
  hypothesize: "Hypothesis",
  intervene: "Intervention",
  retest: "Re-test",
  transfer: "Transfer",
  update: "Update",
  adapt: "Adaptation",
};

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

  /** Where the concept sits on the Unknown → Retained ladder. */
  state: LearningState;
  /** The condition keeping it off the next rung, if any. */
  stateBlockedBy: string | null;
  /** How much independent, spaced evidence stands behind all of this. */
  evidenceStrength: EvidenceStrength;
  /** Whether the concept has held up outside recall questions. */
  transfer: TransferEvidence;
  /** Mastery points gained per week over the last four weeks. */
  velocity: number;
  /** Competing causes, each with its own support. */
  hypotheses: Hypothesis[];
  /** 0-1 trust in the leading diagnosis. */
  certainty: number;
  /** A controlled test to run when the cause is not yet confirmed. */
  diagnosticTest: DiagnosticTest | null;
  /** True when the recommendation is a test rather than a treatment. */
  isDiagnostic: boolean;
  /** Measured effect of past teaching on this concept. */
  interventions: InterventionHistory;
  /** Why this method, when it differs from the default for the diagnosis. */
  methodReason: string | null;
  /** Full Observe → Adapt trace behind the recommendation. */
  trace: TraceStep[];
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
  /** How many concepts sit at each learning state. */
  stateMix: Record<LearningState, number>;
  /** Share of the path's concepts at functional or above, 0-1. */
  pathFunctional: number;
  hasEvidence: boolean;
  planFor: (minutes: number) => LearningPlan;
}

export const DIAGNOSIS_LABEL: Record<Diagnosis, string> = {
  never_learned: "Not started",
  prerequisite_gap: "Prerequisite gap",
  retrieval_failure: "Retrieval failure",
  misconception: "Misconception",
  application_failure: "Can explain it, can't apply it",
  troubleshooting_failure: "Fault-finding needs work",
  confident_but_wrong: "Confident but wrong",
  fading: "Fading",
  solid: "Solid",
};

export const METHOD_LABEL: Record<TeachingMethod, string> = {
  read: "Read",
  worked_example: "Study a worked example",
  guided_practice: "Guided practice",
  retrieval_drill: "Retrieval drill",
  scenario: "Real-world scenario",
  hands_on: "Hands-on work",
  explain_back: "Explain it back",
  tutor: "Ask the AI tutor",
};

export type { EvidenceStrength, TransferEvidence } from "./evidence";
export type { DiagnosticTest, Hypothesis, HypothesisSet } from "./hypothesis";
export type { InterventionHistory, MethodEffect } from "./interventions";
export type { LearningState } from "./states";
export { STATE_LABEL, STATE_MEANING, STATE_ORDER } from "./states";
