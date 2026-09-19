import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FailureRecord, HealthSnapshot, ImprovementCandidate, MonitoringDecision, PromotionDecision } from "./types";

export interface AutonomyLedgerEntry { at: string; stage: "observe" | "candidate" | "approval" | "deploy" | "monitor" | "rollback" | "result"; domainId: string; packageKey: string; snapshotId?: string; candidateId?: string; detail: string }
const QUALITY_DIR = ".quality";
const AUTONOMY_LEDGER = `${QUALITY_DIR}/autonomy-ledger.json`;
const FAILURE_LEDGER = `${QUALITY_DIR}/failure-memory.json`;

function readArray<T>(path: string): T[] { return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as T[] : []; }
function append<T>(path: string, value: T): void { mkdirSync(QUALITY_DIR, { recursive: true }); writeFileSync(path, `${JSON.stringify([...readArray<T>(path), value], null, 2)}\n`); }
export function appendAutonomyEntry(entry: AutonomyLedgerEntry): void { append(AUTONOMY_LEDGER, entry); }
export function appendFailure(record: FailureRecord): void {
  const known = readArray<FailureRecord>(FAILURE_LEDGER);
  if (known.some((item) => item.id === record.id && item.outcome === record.outcome)) return;
  mkdirSync(QUALITY_DIR, { recursive: true }); writeFileSync(FAILURE_LEDGER, `${JSON.stringify([...known, record], null, 2)}\n`);
}
export function readFailureMemory(): FailureRecord[] { return readArray<FailureRecord>(FAILURE_LEDGER); }
export function recordRun(input: { snapshot: HealthSnapshot; candidates: ImprovementCandidate[]; decisions?: PromotionDecision[]; monitoring?: MonitoringDecision }): void {
  appendAutonomyEntry({ at: input.snapshot.measuredAt, stage: "observe", domainId: input.snapshot.domainId, packageKey: input.snapshot.packageKey, snapshotId: input.snapshot.id, detail: `${input.snapshot.signalCount} signals; ${input.snapshot.findings.length} findings; health ${input.snapshot.overallScore.toFixed(3)}.` });
  for (const candidate of input.candidates) appendAutonomyEntry({ at: candidate.createdAt, stage: "candidate", domainId: candidate.domainId, packageKey: candidate.packageKey, candidateId: candidate.id, detail: `${candidate.action}: ${candidate.rationale}` });
  for (const decision of input.decisions ?? []) appendAutonomyEntry({ at: decision.decidedAt, stage: "approval", domainId: input.snapshot.domainId, packageKey: input.snapshot.packageKey, candidateId: decision.candidateId, detail: `${decision.action}: ${decision.reasons.join(" ")}` });
  if (input.monitoring) appendAutonomyEntry({ at: input.monitoring.decidedAt, stage: input.monitoring.action === "rollback" ? "rollback" : "monitor", domainId: input.snapshot.domainId, packageKey: input.snapshot.packageKey, snapshotId: input.snapshot.id, detail: `${input.monitoring.action}: ${input.monitoring.reasons.join(" ")}` });
}