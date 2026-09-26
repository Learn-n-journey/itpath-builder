import { describe, expect, it } from "vitest";

import { a1MeasurementScenarios } from "@/data/auto/a1-measurement-decisions";

describe("A1 Measure → Decide → Verify cases", () => {
  it("covers the four measurement/procedural A1 modules without duplicate topics", () => {
    expect(a1MeasurementScenarios).toHaveLength(4);
    expect(new Set(a1MeasurementScenarios.map((scenario) => scenario.topicId)).size).toBe(4);
  });

  it.each(a1MeasurementScenarios)("$topicId requires a measurement chain before a service decision", (scenario) => {
    expect(scenario.measurements.length).toBeGreaterThanOrEqual(3);
    for (const measurement of scenario.measurements) {
      expect(measurement.result.length).toBeGreaterThan(20);
      expect(measurement.interpretation.length).toBeGreaterThan(20);
    }
  });

  it.each(a1MeasurementScenarios)("$topicId has one supported decision and realistic alternatives", (scenario) => {
    expect(scenario.decisionChoices.filter((choice) => choice.correct)).toHaveLength(1);
    expect(scenario.decisionChoices.filter((choice) => !choice.correct).length).toBeGreaterThanOrEqual(2);
  });

  it.each(a1MeasurementScenarios)("$topicId requires multiple verification checks", (scenario) => {
    expect(scenario.verification.length).toBeGreaterThanOrEqual(3);
  });
});
