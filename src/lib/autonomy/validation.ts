import type { DomainPackage } from "@/domain/package";
import { auditPackage } from "@/lib/domain/package-audit";
import type { ImprovementCandidate, PromotionDecision, ValidationEvidence } from "./types";
import { AUTONOMY_RULES } from "./rules";
import { stableId } from "./health";

export interface ExactSizeResult { passed: boolean; failures: Array<{ assessmentId: string; expected: number; actual: number }> }

/** Every assessment blueprint must exactly match the package's declared paper size. */
export function validateExactAssessmentSizes(pkg: DomainPackage): ExactSizeResult {
  const expected = pkg.assessmentSizes?.stageExam;
  if (!expected) return { passed: false, failures: pkg.assessments.map((item) => ({ assessmentId: item.id, expected: 0, actual: item.questionCount })) };
  const failures = pkg.assessments.filter((assessment) => assessment.questionCount !== expected).map((assessment) => ({ assessmentId: assessment.id, expected, actual: assessment.questionCount }));
  return { passed: failures.length === 0, failures };
}

export function validateCandidate(pkg: DomainPackage, regressionPassed: boolean): ValidationEvidence {
  const audit = auditPackage(pkg);
  return { packageBlocking: audit.blocking, packageWarnings: audit.warnings, exactAssessmentSizes: validateExactAssessmentSizes(pkg).passed, regressionPassed };
}

/** Approval is a pure rule decision. No generator or advisor can override it. */
export function decidePromotion(candidate: ImprovementCandidate, evidence: ValidationEvidence, now: Date = new Date()): PromotionDecision {
  const reasons: string[] = [];
  if (evidence.packageBlocking > 0) reasons.push(`${evidence.packageBlocking} blocking package findings remain.`);
  if (!evidence.exactAssessmentSizes) reasons.push(`${AUTONOMY_RULES.assessmentSize}: an assessment does not match its declared size.`);
  if (!evidence.regressionPassed) reasons.push(`${AUTONOMY_RULES.regression}: regression tests failed.`);
  return {
    id: stableId("promotion", candidate.id, evidence.packageBlocking, evidence.packageWarnings, evidence.exactAssessmentSizes ? 1 : 0, evidence.regressionPassed ? 1 : 0),
    candidateId: candidate.id, action: reasons.length === 0 ? "approve" : "reject",
    reasons: reasons.length === 0 ? ["All deterministic blocking checks passed."] : reasons,
    evidence, decidedAt: now.toISOString(),
  };
}