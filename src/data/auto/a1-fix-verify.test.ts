import { describe, expect, it } from "vitest";

import { a1BranchingScenarios } from "@/data/auto/a1-branching-diagnosis";

describe("A1 branching Fix → Verify cases", () => {
  it("keeps the pilot limited to the three proven branching cases", () => {
    expect(a1BranchingScenarios).toHaveLength(3);
  });

  it.each(a1BranchingScenarios)("$topicId has one evidence-supported repair and realistic failed-repair evidence", (scenario) => {
    const correctRepairs = scenario.repairChoices.filter((choice) => choice.correct);
    const incorrectRepairs = scenario.repairChoices.filter((choice) => !choice.correct);

    expect(correctRepairs).toHaveLength(1);
    expect(incorrectRepairs.length).toBeGreaterThanOrEqual(2);
    for (const repair of incorrectRepairs) {
      expect(repair.verificationFailureEvidence?.length ?? 0).toBeGreaterThan(20);
    }
  });

  it.each(a1BranchingScenarios)("$topicId requires multiple valid verification checks and rejects a shortcut", (scenario) => {
    const validChecks = scenario.verificationChoices.filter((choice) => choice.correct);
    const invalidChecks = scenario.verificationChoices.filter((choice) => !choice.correct);

    expect(validChecks.length).toBeGreaterThanOrEqual(2);
    expect(invalidChecks.length).toBeGreaterThanOrEqual(1);
  });

  it.each(a1BranchingScenarios)("$topicId preserves diagnosis as evidence-gated", (scenario) => {
    expect(scenario.diagnosisThreshold).toBeGreaterThanOrEqual(2);
    expect(scenario.tests.length).toBeGreaterThanOrEqual(scenario.diagnosisThreshold);
    expect(scenario.causes.some((cause) => cause.id === scenario.hiddenCauseId)).toBe(true);
  });
});
