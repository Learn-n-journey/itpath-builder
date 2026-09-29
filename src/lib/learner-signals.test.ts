import { describe, expect, it } from "vitest";
import { createDefaultUserData } from "@/lib/app-data/defaults";
import {
  bestSimulatorHelpLevel,
  shouldRecordSimulatorOutcome,
  simulatorOutcomeSignal,
} from "./learner-signals";

function withSignal(helpLevel: number) {
  const user=createDefaultUserData();
  user.learnerSignals.push({
    id:`signal-help-${helpLevel}`,
    at:"2026-09-01T12:00:00.000Z",
    ...simulatorOutcomeSignal("topic-test","lab","lab-test",1,helpLevel),
  });
  return user;
}

describe("simulator independence evidence", () => {
  it("records progressively stronger independence", () => {
    const assisted=withSignal(2);
    expect(bestSimulatorHelpLevel(assisted,"lab","lab-test")).toBe(2);
    expect(shouldRecordSimulatorOutcome(assisted,"lab","lab-test",1)).toBe(true);
    expect(shouldRecordSimulatorOutcome(assisted,"lab","lab-test",0)).toBe(true);
    expect(shouldRecordSimulatorOutcome(assisted,"lab","lab-test",2)).toBe(false);
    expect(shouldRecordSimulatorOutcome(assisted,"lab","lab-test",3)).toBe(false);
  });

  it("stops adding weaker evidence after independent success", () => {
    const independent=withSignal(0);
    expect(bestSimulatorHelpLevel(independent,"lab","lab-test")).toBe(0);
    expect(shouldRecordSimulatorOutcome(independent,"lab","lab-test",0)).toBe(false);
    expect(shouldRecordSimulatorOutcome(independent,"lab","lab-test",1)).toBe(false);
    expect(shouldRecordSimulatorOutcome(independent,"lab","lab-test",3)).toBe(false);
  });

  it("keeps legacy unsuffixed simulator credit from blocking tagged independence evidence", () => {
    const user=createDefaultUserData();
    user.learnerSignals.push({
      id:"legacy",
      topicId:"topic-test",
      kind:"lab",
      at:"2026-08-01T12:00:00.000Z",
      correct:true,
      score:1,
      errorTag:"simulator:lab-test",
    });
    expect(shouldRecordSimulatorOutcome(user,"lab","lab-test",0)).toBe(true);
  });
});
