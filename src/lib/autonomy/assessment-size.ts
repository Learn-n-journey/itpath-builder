import type { DomainPackage } from "@/domain/package";

export interface ExactSizeResult {
  passed: boolean;
  failures: Array<{ assessmentId: string; expected: number; actual: number }>;
}

/** Every assessment blueprint must exactly match the package's declared paper size. */
export function validateExactAssessmentSizes(pkg: DomainPackage): ExactSizeResult {
  const expected = pkg.assessmentSizes?.stageExam;
  if (!expected) {
    return { passed: false, failures: pkg.assessments.map((item) => ({ assessmentId: item.id, expected: 0, actual: item.questionCount })) };
  }
  const failures = pkg.assessments
    .filter((assessment) => assessment.questionCount !== expected)
    .map((assessment) => ({ assessmentId: assessment.id, expected, actual: assessment.questionCount }));
  return { passed: failures.length === 0, failures };
}