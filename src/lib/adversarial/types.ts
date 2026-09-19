/**
 * The language of the stress test.
 *
 * Nothing here knows what subject is being taught. A defect is described by
 * what kind of harm it does to a course, never by the field it appears in, so
 * the same suite pushes against IT, auto repair, or anything added later.
 */
import type { DomainPackage } from "@/domain/package";
import type { Finding } from "@/lib/quality/types";

/** The kinds of harm a writer, human or machine, can do to a course. */
export type DefectCategory =
  | "wrong-facts"
  | "duplicate-questions"
  | "invalid-questions"
  | "answer-key"
  | "prerequisites"
  | "objective-mismatch"
  | "untaught-assessment"
  | "filler-content"
  | "broken-sources"
  | "schema-valid-poor";

export const DEFECT_CATEGORIES: DefectCategory[] = [
  "wrong-facts",
  "duplicate-questions",
  "invalid-questions",
  "answer-key",
  "prerequisites",
  "objective-mismatch",
  "untaught-assessment",
  "filler-content",
  "broken-sources",
  "schema-valid-poor",
];

/**
 * One deliberate defect.
 *
 * `apply` damages a copy of a healthy package. The harness never repairs by
 * guessing: it restores the damaged parts from the untouched original, so the
 * correction step is as deterministic as the detection step.
 */
export interface Injection {
  /** Stable id, so a defect found once is recognised forever. */
  id: string;
  category: DefectCategory;
  /** What the defect is, in plain words. */
  description: string;
  apply: (pkg: DomainPackage) => DomainPackage;
}

export interface DetectionOutcome {
  injectionId: string;
  category: DefectCategory;
  description: string;
  detected: boolean;
  /** Rules that fired only because of the injected defect. */
  rulesFired: string[];
  /** The things QA blamed, by stable id. */
  subjectIds: string[];
  newFindings: Finding[];
}

export interface CategoryCoverage {
  category: DefectCategory;
  total: number;
  detected: number;
  percentage: number;
  missed: string[];
}

export interface CoverageReport {
  startedAt: string;
  packageKey: string;
  total: number;
  detected: number;
  missed: number;
  percentage: number;
  byCategory: CategoryCoverage[];
  outcomes: DetectionOutcome[];
  /** Categories no deterministic engine catches yet. */
  weaknesses: string[];
}

/** One walk of Generate -> Inject -> Detect -> Correct -> Retest -> Approve/Reject. */
export interface LoopResult {
  injectionId: string;
  category: DefectCategory;
  detectedBeforeCorrection: boolean;
  decisionBeforeCorrection: "approve" | "reject";
  decisionAfterCorrection: "approve" | "reject";
  cleanAfterCorrection: boolean;
  reasonsBefore: string[];
  reasonsAfter: string[];
}
