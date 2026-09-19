import type { DomainPackage } from "@/domain/package";
import type { LearnerSignal } from "@/lib/app-data/types";

export const AUTONOMY_SCHEMA_VERSION = 1 as const;

export type HealthStatus = "healthy" | "watch" | "weak" | "insufficient";
export type HealthKind = "concept" | "lesson" | "assessment" | "prerequisite";

export interface AutonomyThresholds {
  version: string;
  minimumGradedEvidence: number;
  minimumMonitoringEvidence: number;
  weakMastery: number;
  weakRetention: number;
  repeatedFailureCount: number;
  repeatedMisconceptionCount: number;
  prerequisiteMastery: number;
  acceptableAssessmentAccuracy: number;
  masteryTarget: number;
  maximumHealthDegradation: number;
  maximumFailureRateIncrease: number;
}

export interface TelemetryAggregate {
  evidence: number;
  gradedEvidence: number;
  successes: number;
  failures: number;
  retries: number;
  completionRate: number;
  mastery: number;
  retention: number;
  timeToMasteryMs: number | null;
  misconceptionCounts: Record<string, number>;
  firstEvidenceAt: string | null;
  lastEvidenceAt: string | null;
}

export interface HealthScore extends TelemetryAggregate {
  id: string;
  kind: HealthKind;
  subjectId: string;
  parentId?: string;
  score: number;
  confidence: number;
  status: HealthStatus;
  reasons: string[];
}

export interface AutonomyFinding {
  id: string;
  ruleId: string;
  subjectId: string;
  kind: HealthKind;
  severity: "blocking" | "warning";
  measured: number;
  threshold: number;
  evidence: number;
  detail: string;
}

export interface ImprovementCandidate {
  id: string;
  domainId: string;
  packageKey: string;
  parentVersion: string;
  candidateVersion: string;
  findingIds: string[];
  targetIds: string[];
  action: "review-content" | "strengthen-prerequisite" | "repair-assessment";
  rationale: string;
  status: "proposed" | "validated" | "approved" | "deployed" | "rejected" | "rolled-back";
  createdAt: string;
}

export interface HealthSnapshot {
  schemaVersion: typeof AUTONOMY_SCHEMA_VERSION;
  id: string;
  domainId: string;
  packageKey: string;
  ruleVersion: string;
  measuredAt: string;
  signalCount: number;
  concepts: HealthScore[];
  lessons: HealthScore[];
  assessments: HealthScore[];
  prerequisites: HealthScore[];
  findings: AutonomyFinding[];
  overallScore: number;
}

export interface ValidationEvidence {
  packageBlocking: number;
  packageWarnings: number;
  exactAssessmentSizes: boolean;
  regressionPassed: boolean;
}

export interface PromotionDecision {
  id: string;
  candidateId: string;
  action: "approve" | "reject";
  reasons: string[];
  evidence: ValidationEvidence;
  decidedAt: string;
}

export interface MonitoringDecision {
  id: string;
  packageKey: string;
  action: "keep" | "rollback" | "wait";
  reasons: string[];
  baselineScore: number;
  currentScore: number;
  baselineFailureRate: number;
  currentFailureRate: number;
  decidedAt: string;
}

export interface FailureRecord {
  id: string;
  domainId: string;
  packageKey: string;
  candidateId: string | null;
  failure: string;
  rootCause: string;
  correction: string;
  testResult: string;
  preventionRule: string;
  outcome: "prevented" | "rejected" | "rolled-back" | "corrected";
  recordedAt: string;
}

export interface AutonomyInput {
  pkg: DomainPackage;
  evidence: LearnerSignal[];
  now?: Date;
  thresholds?: AutonomyThresholds;
}

export interface DeploymentAdapter {
  deploy(candidate: ImprovementCandidate): Promise<{ ok: boolean; detail: string }>;
  rollback(packageKey: string): Promise<{ ok: boolean; detail: string }>;
}