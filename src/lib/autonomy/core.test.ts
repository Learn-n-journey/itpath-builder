import { describe, expect, it } from "vitest";

import type { DomainPackage } from "@/domain/package";
import type { LearnerSignal } from "@/lib/app-data/types";
import { registry } from "@/domain/registry";
import { runAutonomyCore, approveCandidate, failureFromDecision, monitorDeployment, validateCandidate, validateExactAssessmentSizes, thresholdsFromFailureMemory } from "./core";
import { deployApprovedCandidate, enforceMonitoringDecision } from "./lifecycle";
import { AUTONOMY_RULES, DEFAULT_AUTONOMY_THRESHOLDS } from "./rules";

const NOW = new Date("2026-09-19T03:30:00.000Z");

function evidence(pkg: DomainPackage, outcome: "strong" | "weak", count = 30): LearnerSignal[] {
  const section = pkg.sections.find((item) => pkg.prerequisites.some((link) => link.sectionId === item.id)) ?? pkg.sections[0];
  if (!section) throw new Error("Fixture package has no sections.");
  return Array.from({ length: count }, (_, index) => {
    const signal: LearnerSignal = {
      id: `signal-${index}`,
      topicId: index % 2 === 0 ? section.id : section.slug,
      kind: index % 3 === 0 ? "recall" : "quiz",
      correct: outcome === "strong" ? true : index % 5 === 0,
      score: outcome === "strong" ? 1 : index % 5 === 0 ? 0.8 : 0.2,
      elapsedMs: 20_000,
      at: new Date(NOW.getTime() - (count - index) * 60_000).toISOString(),
    };
    return outcome === "weak" ? { ...signal, errorTag: "repeated-model-error" } : signal;
  });
}

function supportsStaticPackageQa(pkg: DomainPackage): boolean {
  return pkg.questions.length > 0 && pkg.sources.length > 0 && pkg.qualifications.every((item) => item.objectives.length >= 3);
}

async function packages(): Promise<DomainPackage[]> {
  return Promise.all(Object.values(registry).map(async (entry) => {
    if (!entry.load) throw new Error(`${entry.manifest.key} has no loader.`);
    return entry.load();
  }));
}

describe("domain-neutral Autonomy Core", () => {
  it("runs unchanged against every registered domain and preserves sparse evidence", async () => {
    for (const pkg of await packages()) {
      const empty = runAutonomyCore({ pkg, evidence: [], now: NOW });
      expect(empty.snapshot.domainId).toBe(pkg.manifest.id);
      expect(empty.snapshot.lessons.every((score) => score.status === "insufficient")).toBe(true);
      expect(empty.snapshot.findings).toEqual([]);

      const measured = runAutonomyCore({ pkg, evidence: evidence(pkg, "weak"), now: NOW });
      expect(measured.snapshot.signalCount).toBe(30);
      expect(measured.snapshot.findings.length).toBeGreaterThan(0);
      expect(measured.candidates.length).toBeGreaterThan(0);
      expect(measured.candidates.every((candidate) => candidate.domainId === pkg.manifest.id)).toBe(true);
    }
  }, 30_000);

  it("keeps stable finding and candidate ids for the same evidence", async () => {
    const pkg = (await packages()).find(supportsStaticPackageQa);
    if (!pkg) throw new Error("No self-contained domain package loaded.");
    const first = runAutonomyCore({ pkg, evidence: evidence(pkg, "weak"), now: NOW });
    const second = runAutonomyCore({ pkg, evidence: evidence(pkg, "weak"), now: NOW });
    expect(second.snapshot.findings.map((item) => item.id)).toEqual(first.snapshot.findings.map((item) => item.id));
    expect(second.candidates.map((item) => item.id)).toEqual(first.candidates.map((item) => item.id));
  });

  it("requires exact assessment sizes and passing QA/regressions for approval", async () => {
    for (const pkg of await packages()) expect(validateExactAssessmentSizes(pkg).passed).toBe(true);
    const pkg = (await packages()).find(supportsStaticPackageQa);
    if (!pkg) throw new Error("No self-contained domain package loaded.");
    const run = runAutonomyCore({ pkg, evidence: evidence(pkg, "weak"), now: NOW });
    const candidate = run.candidates[0];
    if (!candidate) throw new Error("No improvement candidate was produced.");
    expect(approveCandidate(candidate, validateCandidate(pkg, true), NOW).action).toBe("approve");
    expect(approveCandidate(candidate, validateCandidate(pkg, false), NOW).action).toBe("reject");
  }, 30_000);

  it("deploys only approved candidates and rolls back measurable degradation", async () => {
    const pkg = (await packages()).find(supportsStaticPackageQa);
    if (!pkg) throw new Error("No self-contained domain package loaded.");
    const weak = runAutonomyCore({ pkg, evidence: evidence(pkg, "weak"), now: NOW });
    const strong = runAutonomyCore({ pkg, evidence: evidence(pkg, "strong"), now: new Date(NOW.getTime() - 86_400_000) });
    const candidate = weak.candidates[0];
    if (!candidate) throw new Error("No improvement candidate was produced.");
    const approval = approveCandidate(candidate, validateCandidate(pkg, true), NOW);
    let deployed = 0;
    let rolledBack = 0;
    const adapter = {
      deploy: async () => { deployed += 1; return { ok: true, detail: "deployed" }; },
      rollback: async () => { rolledBack += 1; return { ok: true, detail: "rolled back" }; },
    };
    expect((await deployApprovedCandidate(candidate, approval, adapter)).deployed).toBe(true);
    const monitor = monitorDeployment(strong.snapshot, weak.snapshot, NOW);
    expect(monitor.action).toBe("rollback");
    expect((await enforceMonitoringDecision(monitor, adapter)).rolledBack).toBe(true);
    expect({ deployed, rolledBack }).toEqual({ deployed: 1, rolledBack: 1 });
  }, 30_000);

  it("refuses to compare different domains or rule versions", async () => {
    const loaded = await packages();
    const first = loaded[0];
    // Two different subjects: several versions of the same subject share a
    // domain id, and comparing those is exactly what this rule allows.
    const second = loaded.find((pkg) => pkg.definition.id !== first?.definition.id);
    if (!first || !second) throw new Error("Two different domain packages are required.");
    const baseline = runAutonomyCore({ pkg: first, evidence: evidence(first, "strong"), now: NOW });
    const current = runAutonomyCore({ pkg: second, evidence: evidence(second, "weak"), now: NOW });
    expect(monitorDeployment(baseline.snapshot, current.snapshot, NOW).action).toBe("wait");
  }, 30_000);

  it("records failures with stable ids and strengthens future prevention thresholds", () => {
    const failure = failureFromDecision("sample", "sample@1.0.1", null, "Health degraded", "Weak correction", "Rollback", "Regression passed but monitoring failed", AUTONOMY_RULES.degradation, "rolled-back", NOW);
    const repeat = failureFromDecision("sample", "sample@1.0.1", null, "Health degraded", "Weak correction", "Rollback", "Regression passed but monitoring failed", AUTONOMY_RULES.degradation, "rolled-back", NOW);
    expect(repeat.id).toBe(failure.id);
    const learned = thresholdsFromFailureMemory([failure]);
    expect(learned.maximumHealthDegradation).toBeLessThan(DEFAULT_AUTONOMY_THRESHOLDS.maximumHealthDegradation);
    expect(learned.minimumMonitoringEvidence).toBeGreaterThan(DEFAULT_AUTONOMY_THRESHOLDS.minimumMonitoringEvidence);
  });
});