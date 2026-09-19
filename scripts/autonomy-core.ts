import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { registry } from "@/domain/registry";
import type { DomainPackage } from "@/domain/package";
import type { LearnerSignal } from "@/lib/app-data/types";
import { approveCandidate, failureFromDecision, monitorDeployment, runAutonomyCore, validateCandidate } from "@/lib/autonomy/core";
import { deployApprovedCandidate, enforceMonitoringDecision } from "@/lib/autonomy/lifecycle";
import { appendAutonomyEntry, appendFailure, readFailureMemory, recordRun } from "@/lib/autonomy/ledger.server";
import { AUTONOMY_RULES, thresholdsFromFailureMemory } from "@/lib/autonomy/rules";

const now = new Date("2026-09-19T03:30:00.000Z");
const stage = (name: string, detail: string) => console.log(`[${name}] ${detail}`);

function fixture(pkg: DomainPackage, strong: boolean): LearnerSignal[] {
  const section = pkg.sections.find((item) => pkg.prerequisites.some((link) => link.sectionId === item.id)) ?? pkg.sections[0];
  if (!section) throw new Error(`${pkg.manifest.key} has no sections.`);
  return Array.from({ length: 30 }, (_, index) => {
    const signal: LearnerSignal = {
      id: `${pkg.manifest.id}-proof-${strong ? "baseline" : "degraded"}-${index}`,
      topicId: index % 2 === 0 ? section.id : section.slug,
      kind: index % 3 === 0 ? "recall" : "quiz",
      correct: strong ? true : index % 5 === 0,
      score: strong ? 1 : index % 5 === 0 ? 0.8 : 0.2,
      at: new Date(now.getTime() - (30 - index) * 60_000).toISOString(),
    };
    return strong ? signal : { ...signal, errorTag: "proof-repeated-error" };
  });
}

stage("test", "running Autonomy Core and domain package regression tests");
const testsPassed = spawnSync("bunx", ["vitest", "run", "src/lib/autonomy/core.test.ts", "src/domain/package.test.ts"], { stdio: "inherit" }).status === 0;
if (!testsPassed) process.exit(1);

const failuresBefore = readFailureMemory();
const thresholds = thresholdsFromFailureMemory(failuresBefore);
const report = [];
for (const entry of Object.values(registry)) {
  if (!entry.load) throw new Error(`${entry.manifest.key} has no package loader.`);
  const pkg = await entry.load();
  stage("observe", pkg.manifest.key);
  const baseline = runAutonomyCore({ pkg, evidence: fixture(pkg, true), now: new Date(now.getTime() - 86_400_000), thresholds });
  const degraded = runAutonomyCore({ pkg, evidence: fixture(pkg, false), now, thresholds });
  stage("diagnose", `${degraded.snapshot.findings.length} findings produced by versioned rules`);
  const decisions = degraded.candidates.map((candidate) => approveCandidate(candidate, validateCandidate(pkg, testsPassed), now));
  const monitoring = monitorDeployment(baseline.snapshot, degraded.snapshot, now, thresholds);
  let deploymentCount = 0;
  let rollbackCount = 0;
  const proofAdapter = {
    deploy: async () => { deploymentCount += 1; return { ok: true, detail: "Proof deployment adapter accepted an approved candidate." }; },
    rollback: async () => { rollbackCount += 1; return { ok: true, detail: "Proof deployment adapter restored the baseline version." }; },
  };
  const firstCandidate = degraded.candidates[0];
  const firstDecision = decisions[0];
  if (firstCandidate && firstDecision) {
    const deployment = await deployApprovedCandidate(firstCandidate, firstDecision, proofAdapter);
    appendAutonomyEntry({ at: now.toISOString(), stage: "deploy", domainId: pkg.manifest.id, packageKey: pkg.manifest.key, candidateId: firstCandidate.id, detail: deployment.detail });
  }
  await enforceMonitoringDecision(monitoring, proofAdapter);
  recordRun({ snapshot: degraded.snapshot, candidates: degraded.candidates, decisions, monitoring });
  if (monitoring.action === "rollback") {
    const failure = failureFromDecision(pkg.manifest.id, pkg.manifest.key, degraded.candidates[0]?.id ?? null, "Protected learner outcomes degraded after deployment.", "The candidate failed post-deployment health thresholds.", "Restore the prior active package version.", `${testsPassed ? "Regression passed" : "Regression failed"}; monitoring required rollback.`, AUTONOMY_RULES.degradation, "rolled-back", now);
    appendFailure(failure);
  }
  report.push({ packageKey: pkg.manifest.key, baselineHealth: baseline.snapshot.overallScore, degradedHealth: degraded.snapshot.overallScore, findings: degraded.snapshot.findings.length, candidates: degraded.candidates.length, approvals: decisions.filter((item) => item.action === "approve").length, deploymentCount, monitoring: monitoring.action, rollbackCount });
  stage("result", `${pkg.manifest.key}: ${deploymentCount} deployment; ${monitoring.action}; ${rollbackCount} rollback`);
}

mkdirSync(".quality", { recursive: true });
const learnedThresholds = thresholdsFromFailureMemory(readFailureMemory());
writeFileSync(".quality/autonomy-proof.json", `${JSON.stringify({ schemaVersion: 1, ruleAuthority: "deterministic", aiAuthority: "none", generatedAt: now.toISOString(), testsPassed, failureMemoryApplied: thresholds.version, learnedRuleVersion: learnedThresholds.version, safeguardsStrengthened: learnedThresholds.minimumMonitoringEvidence >= thresholds.minimumMonitoringEvidence && learnedThresholds.maximumHealthDegradation <= thresholds.maximumHealthDegradation, domains: report }, null, 2)}\n`);
stage("record", "proof written to .quality/autonomy-proof.json");