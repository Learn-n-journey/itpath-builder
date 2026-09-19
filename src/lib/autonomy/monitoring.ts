import type { HealthSnapshot, MonitoringDecision, AutonomyThresholds } from "./types";
import { stableId } from "./health";

function totals(snapshot: HealthSnapshot): { graded: number; failures: number } {
  return snapshot.lessons.reduce((result, score) => ({ graded: result.graded + score.gradedEvidence, failures: result.failures + score.failures }), { graded: 0, failures: 0 });
}

export function decideMonitoring(baseline: HealthSnapshot, current: HealthSnapshot, thresholds: AutonomyThresholds, now: Date = new Date()): MonitoringDecision {
  const before = totals(baseline);
  const after = totals(current);
  const baselineFailureRate = before.graded === 0 ? 0 : before.failures / before.graded;
  const currentFailureRate = after.graded === 0 ? 0 : after.failures / after.graded;
  const reasons: string[] = [];
  let action: MonitoringDecision["action"] = "keep";
  if (after.graded < thresholds.minimumMonitoringEvidence || before.graded < thresholds.minimumMonitoringEvidence) {
    action = "wait";
    reasons.push("Monitoring evidence has not reached the declared minimum sample size.");
  } else {
    if (baseline.overallScore - current.overallScore > thresholds.maximumHealthDegradation) reasons.push("Aggregate health degraded beyond the allowed margin.");
    if (currentFailureRate - baselineFailureRate > thresholds.maximumFailureRateIncrease) reasons.push("Failure rate increased beyond the allowed margin.");
    action = reasons.length > 0 ? "rollback" : "keep";
    if (reasons.length === 0) reasons.push("Protected health and failure-rate metrics remain within limits.");
  }
  return { id: stableId("monitor", baseline.id, current.id, action), packageKey: current.packageKey, action, reasons, baselineScore: baseline.overallScore, currentScore: current.overallScore, baselineFailureRate, currentFailureRate, decidedAt: now.toISOString() };
}