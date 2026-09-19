import type { AutonomyInput, FailureRecord, HealthSnapshot, ImprovementCandidate, MonitoringDecision, PromotionDecision, ValidationEvidence } from "./types";
import { AUTONOMY_SCHEMA_VERSION } from "./types";
import { DEFAULT_AUTONOMY_THRESHOLDS } from "./rules";
import { observeTelemetry } from "./telemetry";
import { diagnoseHealth, measureHealth, stableId } from "./health";
import { createImprovementCandidates } from "./candidates";
import { decidePromotion } from "./validation";
import { decideMonitoring } from "./monitoring";

const average = (values: number[]) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

export function runAutonomyCore(input: AutonomyInput): { snapshot: HealthSnapshot; candidates: ImprovementCandidate[] } {
  const now = input.now ?? new Date();
  const thresholds = input.thresholds ?? DEFAULT_AUTONOMY_THRESHOLDS;
  const telemetry = observeTelemetry(input.pkg, input.evidence, thresholds);
  const measured = measureHealth(input.pkg, telemetry, thresholds);
  const findings = diagnoseHealth(measured, thresholds);
  const eligible = [...measured.lessons, ...measured.assessments].filter((score) => score.status !== "insufficient");
  const snapshot: HealthSnapshot = {
    schemaVersion: AUTONOMY_SCHEMA_VERSION, id: stableId("snapshot", input.pkg.manifest.key, thresholds.version, now.toISOString(), telemetry.signalCount),
    domainId: input.pkg.manifest.id, packageKey: input.pkg.manifest.key, ruleVersion: thresholds.version, measuredAt: now.toISOString(), signalCount: telemetry.signalCount,
    ...measured, findings, overallScore: average(eligible.map((score) => score.score)),
  };
  return { snapshot, candidates: createImprovementCandidates(input.pkg, findings, now) };
}

export const approveCandidate = (candidate: ImprovementCandidate, evidence: ValidationEvidence, now?: Date): PromotionDecision => decidePromotion(candidate, evidence, now);
export const monitorDeployment = (baseline: HealthSnapshot, current: HealthSnapshot, now?: Date): MonitoringDecision => decideMonitoring(baseline, current, DEFAULT_AUTONOMY_THRESHOLDS, now);

export function failureFromDecision(domainId: string, packageKey: string, candidateId: string | null, failure: string, rootCause: string, correction: string, testResult: string, preventionRule: string, outcome: FailureRecord["outcome"], now: Date = new Date()): FailureRecord {
  return { id: stableId("failure", domainId, packageKey, candidateId ?? "none", failure, rootCause, preventionRule), domainId, packageKey, candidateId, failure, rootCause, correction, testResult, preventionRule, outcome, recordedAt: now.toISOString() };
}

export type { AutonomyInput, FailureRecord, HealthSnapshot, ImprovementCandidate, MonitoringDecision, PromotionDecision, ValidationEvidence } from "./types";
export { DEFAULT_AUTONOMY_THRESHOLDS, thresholdsFromFailureMemory } from "./rules";
export { validateCandidate, validateExactAssessmentSizes } from "./validation";