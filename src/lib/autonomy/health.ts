import type { DomainPackage } from "@/domain/package";
import type { AutonomyFinding, AutonomyThresholds, HealthKind, HealthScore, HealthStatus, TelemetryAggregate } from "./types";
import type { ObservedTelemetry } from "./telemetry";
import { AUTONOMY_RULES } from "./rules";

export function stableId(...parts: Array<string | number>): string {
  const source = parts.join("|");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ac-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

function scoreOf(metric: TelemetryAggregate, thresholds: AutonomyThresholds): number {
  if (metric.gradedEvidence === 0) return 0;
  const misconceptionPenalty = Math.min(0.25, Object.values(metric.misconceptionCounts).reduce((a, b) => a + b, 0) * 0.04);
  return clamp(metric.mastery * 0.45 + metric.retention * 0.3 + metric.completionRate * 0.25 - misconceptionPenalty);
}

function statusOf(metric: TelemetryAggregate, score: number, thresholds: AutonomyThresholds): HealthStatus {
  if (metric.gradedEvidence < thresholds.minimumGradedEvidence) return "insufficient";
  if (score < thresholds.weakMastery || metric.failures >= thresholds.repeatedFailureCount) return "weak";
  if (metric.retention < thresholds.weakRetention) return "watch";
  return "healthy";
}

function health(
  id: string,
  kind: HealthKind,
  subjectId: string,
  metric: TelemetryAggregate,
  thresholds: AutonomyThresholds,
  parentId?: string,
): HealthScore {
  const score = scoreOf(metric, thresholds);
  const reasons: string[] = [];
  if (metric.gradedEvidence < thresholds.minimumGradedEvidence) reasons.push("Not enough graded evidence for a quality decision.");
  if (metric.mastery < thresholds.weakMastery && metric.gradedEvidence >= thresholds.minimumGradedEvidence) reasons.push("Mastery is below the declared threshold.");
  if (metric.retention < thresholds.weakRetention && metric.gradedEvidence >= thresholds.minimumGradedEvidence) reasons.push("Recent retention is below the declared threshold.");
  if (metric.failures >= thresholds.repeatedFailureCount) reasons.push("Failures repeated beyond the declared threshold.");
  if (Object.values(metric.misconceptionCounts).some((count) => count >= thresholds.repeatedMisconceptionCount)) reasons.push("The same misconception repeated.");
  return { ...metric, id, kind, subjectId, parentId, score, confidence: clamp(metric.gradedEvidence / 10), status: statusOf(metric, score, thresholds), reasons };
}

function combine(metrics: TelemetryAggregate[]): TelemetryAggregate {
  if (metrics.length === 0) return { evidence: 0, gradedEvidence: 0, successes: 0, failures: 0, retries: 0, completionRate: 0, mastery: 0, retention: 0, timeToMasteryMs: null, misconceptionCounts: {}, firstEvidenceAt: null, lastEvidenceAt: null };
  const gradedEvidence = metrics.reduce((sum, value) => sum + value.gradedEvidence, 0);
  const successes = metrics.reduce((sum, value) => sum + value.successes, 0);
  const misconceptions: Record<string, number> = {};
  for (const metric of metrics) for (const [tag, count] of Object.entries(metric.misconceptionCounts)) misconceptions[tag] = (misconceptions[tag] ?? 0) + count;
  const dates = metrics.flatMap((metric) => [metric.firstEvidenceAt, metric.lastEvidenceAt]).filter((date): date is string => Boolean(date)).sort();
  return {
    evidence: metrics.reduce((sum, value) => sum + value.evidence, 0), gradedEvidence, successes,
    failures: metrics.reduce((sum, value) => sum + value.failures, 0), retries: metrics.reduce((sum, value) => sum + value.retries, 0),
    completionRate: gradedEvidence === 0 ? 0 : successes / gradedEvidence, mastery: gradedEvidence === 0 ? 0 : successes / gradedEvidence,
    retention: metrics.length === 0 ? 0 : metrics.reduce((sum, value) => sum + value.retention, 0) / metrics.length,
    timeToMasteryMs: null, misconceptionCounts: misconceptions, firstEvidenceAt: dates[0] ?? null, lastEvidenceAt: dates.at(-1) ?? null,
  };
}

export interface MeasuredHealth {
  concepts: HealthScore[];
  lessons: HealthScore[];
  assessments: HealthScore[];
  prerequisites: HealthScore[];
}

export function measureHealth(pkg: DomainPackage, telemetry: ObservedTelemetry, thresholds: AutonomyThresholds): MeasuredHealth {
  const metricFor = (sectionId: string) => telemetry.bySection.get(sectionId) ?? combine([]);
  const concepts = pkg.concepts.map((concept) => health(stableId(pkg.manifest.key, "concept", concept.id), "concept", concept.id, metricFor(concept.sectionId), thresholds, concept.sectionId));
  const lessons = pkg.lessons.map((lesson) => health(stableId(pkg.manifest.key, "lesson", lesson.sectionId), "lesson", lesson.sectionId, metricFor(lesson.sectionId), thresholds));
  const assessments = pkg.assessments.map((assessment) => {
    const sectionIds = pkg.sections.filter((section) => assessment.coversQualificationIds.includes(section.qualificationId)).map((section) => section.id);
    return health(stableId(pkg.manifest.key, "assessment", assessment.id), "assessment", assessment.id, combine(sectionIds.map(metricFor)), thresholds);
  });
  const prerequisites = pkg.prerequisites.map((link) => {
    const required = metricFor(link.requiresSectionId);
    const dependent = metricFor(link.sectionId);
    return health(stableId(pkg.manifest.key, "prerequisite", link.sectionId, link.requiresSectionId), "prerequisite", `${link.sectionId}->${link.requiresSectionId}`, combine([required, dependent]), thresholds, link.sectionId);
  });
  return { concepts, lessons, assessments, prerequisites };
}

export function diagnoseHealth(healthScores: MeasuredHealth, thresholds: AutonomyThresholds): AutonomyFinding[] {
  const findings: AutonomyFinding[] = [];
  const add = (score: HealthScore, ruleId: string, measured: number, threshold: number, detail: string, severity: "blocking" | "warning" = "warning") => findings.push({
    id: stableId(ruleId, score.subjectId), ruleId, subjectId: score.subjectId, kind: score.kind, severity, measured, threshold, evidence: score.gradedEvidence, detail,
  });
  for (const score of [...healthScores.concepts, ...healthScores.lessons, ...healthScores.assessments]) {
    if (score.gradedEvidence < thresholds.minimumGradedEvidence) continue;
    const masteryThreshold = score.kind === "assessment" ? thresholds.acceptableAssessmentAccuracy : thresholds.weakMastery;
    if (score.mastery < masteryThreshold) add(score, score.kind === "assessment" ? AUTONOMY_RULES.assessmentAccuracy : AUTONOMY_RULES.weakMastery, score.mastery, masteryThreshold, "Measured mastery is below threshold.");
    if (score.retention < thresholds.weakRetention) add(score, AUTONOMY_RULES.weakRetention, score.retention, thresholds.weakRetention, "Recent retained performance is below threshold.");
    if (score.failures >= thresholds.repeatedFailureCount) add(score, AUTONOMY_RULES.repeatedFailure, score.failures, thresholds.repeatedFailureCount, "Failures have repeated.");
    const repeated = Math.max(0, ...Object.values(score.misconceptionCounts));
    if (repeated >= thresholds.repeatedMisconceptionCount) add(score, AUTONOMY_RULES.repeatedMisconception, repeated, thresholds.repeatedMisconceptionCount, "A misconception has repeated.");
  }
  for (const score of healthScores.prerequisites) {
    if (score.gradedEvidence < thresholds.minimumGradedEvidence) continue;
    if (score.mastery < thresholds.prerequisiteMastery) add(score, AUTONOMY_RULES.prerequisiteWeakness, score.mastery, thresholds.prerequisiteMastery, "Prerequisite evidence is weak while its dependent section is active.", "blocking");
  }
  return [...new Map(findings.map((finding) => [finding.id, finding])).values()].sort((a, b) => a.id.localeCompare(b.id));
}