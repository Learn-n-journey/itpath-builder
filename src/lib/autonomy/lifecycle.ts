import type { DeploymentAdapter, FailureRecord, HealthSnapshot, ImprovementCandidate, MonitoringDecision, PromotionDecision } from "./types";

export interface DeploymentResult {
  deployed: boolean;
  rolledBack: boolean;
  detail: string;
  failure?: FailureRecord;
}

/** Deployment cannot run without an explicit deterministic approval. */
export async function deployApprovedCandidate(
  candidate: ImprovementCandidate,
  decision: PromotionDecision,
  adapter: DeploymentAdapter,
): Promise<DeploymentResult> {
  if (decision.candidateId !== candidate.id || decision.action !== "approve") {
    return { deployed: false, rolledBack: false, detail: "Deployment refused because deterministic approval is absent." };
  }
  const result = await adapter.deploy(candidate);
  return { deployed: result.ok, rolledBack: false, detail: result.detail };
}

/** A rollback decision is authoritative and immediately invokes the supplied deployment boundary. */
export async function enforceMonitoringDecision(
  decision: MonitoringDecision,
  adapter: DeploymentAdapter,
): Promise<DeploymentResult> {
  if (decision.action !== "rollback") {
    return { deployed: true, rolledBack: false, detail: decision.reasons.join(" ") };
  }
  const result = await adapter.rollback(decision.packageKey);
  return { deployed: true, rolledBack: result.ok, detail: result.detail };
}

export function comparableSnapshots(baseline: HealthSnapshot, current: HealthSnapshot): boolean {
  return baseline.domainId === current.domainId && baseline.ruleVersion === current.ruleVersion;
}