/**
 * The shapes QA reports in.
 *
 * These live apart from any auditor so that the domain tooling, the package
 * auditor and the content auditor can all speak the same language without one
 * of them importing another. Nothing here knows what subject is being taught.
 */
import type { Severity } from "./rules";

export interface Finding {
  /** The rule that produced this line. */
  ruleId: string;
  severity: Severity;
  /** Stable name for the thing at fault, for example `question:q-123`. */
  subjectId: string;
  detail: string;
}

export interface AuditReport {
  startedAt: string;
  /** How much was looked at, so a sampled run is never mistaken for a full one. */
  scope: { topics: number; papers: number; questions: number };
  findings: Finding[];
  blocking: number;
  warnings: number;
  passed: boolean;
}

export interface AuditOptions {
  /** Limit the sweep to these sections. Leave empty to audit everything. */
  topicIds?: string[];
  /** How many papers to draw per section and per stage exam. */
  papersEach?: number;
}

export type { Severity } from "./rules";
