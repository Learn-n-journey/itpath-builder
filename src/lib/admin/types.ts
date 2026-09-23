/**
 * Shapes the owner admin area speaks in.
 *
 * A check is never "healthy" because nothing ran: an unrun check is
 * "unknown", and the dashboard says so.
 */

export type HealthState = "healthy" | "warning" | "failed" | "unknown";

export type HealthArea =
  | "system"
  | "content"
  | "sources"
  | "imports"
  | "engine"
  | "flows"
  | "performance";

export interface HealthCheck {
  /** Stable id so the same problem is recognised as the same problem. */
  id: string;
  area: HealthArea;
  /** What was checked, in plain words. */
  label: string;
  state: HealthState;
  /** What failed. */
  detail: string;
  /** What it affects for learners. */
  affects: string;
  /** What the owner should do about it. */
  action: string;
  /** Topic this belongs to, when it is topic level. */
  subjectId?: string;
  /** Straight to the problem: a page path, or a full URL for an outside link. */
  link?: string;
  /** Wording for that link, when the default is not clear enough. */
  linkLabel?: string;
  lastRunAt?: string | null;
}

export interface AreaHealth {
  area: HealthArea;
  state: HealthState;
  checks: HealthCheck[];
  lastRunAt: string | null;
}

/** The four questions the first screen answers. */
export interface AdminOverview {
  working: HealthState;
  content: HealthState;
  blocking: HealthState;
  attention: HealthState;
  areas: AreaHealth[];
  lastRunAt: string | null;
}

export type ContentStatus =
  | "imported"
  | "validated"
  | "preview"
  | "approved"
  | "live"
  | "superseded"
  | "rolled_back"
  | "rejected";

export interface ContentVersion {
  id: string;
  domain: string;
  topicId: string;
  kind: string;
  contentHash: string;
  status: ContentStatus;
  sourceFile: string;
  note: string | null;
  validation: { passed: boolean; blocking: number; warnings: number; findings: string[] };
  importedAt: string;
  validatedAt: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  supersededAt: string | null;
  rolledBackAt: string | null;
}

/** Short, non-sensitive facts attached to a log line or a run summary. */
export type DetailBag = Record<string, string | number | boolean | null>;

export interface ActivityEntry {
  id: string;
  area: string;
  action: string;
  subject: string | null;
  result: "info" | "pass" | "fail" | "blocked";
  detail: DetailBag;
  createdAt: string;
}

export interface FlowCounter {
  day: string;
  flow: string;
  outcome: string;
  count: number;
  slowCount: number;
  totalMs: number;
}
