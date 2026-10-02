import { describe, expect, it } from "vitest";

import { simulatorStorageKey } from "@/lib/simulator-state";
import type { Lab } from "@/lib/app-data/types";
import { simulatorLabContract } from "@/lib/lab-environments";

describe("simulator persistence", () => {
  it("keeps simulator keys separate for each account and guest", () => {
    expect(simulatorStorageKey("virtual-pc", "alice")).not.toBe(simulatorStorageKey("virtual-pc", "bob"));
    expect(simulatorStorageKey("virtual-pc", null)).toContain(":guest:");
    expect(simulatorStorageKey("virtual-pc", "alice")).toContain(":v2");
  });

  it("fails closed when a lab has no explicit simulator contract", () => {
    const lab: Lab = {
      id: "unregistered",
      topicId: "topic-test",
      title: "Unregistered",
      objective: "test",
      category: "windows",
      prerequisites: [],
      difficulty: "gentle",
      estimatedMinutes: 10,
      environment: "",
      instructions: [],
      expectedResult: "",
      checklist: [],
      reflectionPrompt: "",
      masteryScore: 0,
    };
    const contract = simulatorLabContract(lab);
    expect(contract.supported).toBe(false);
    expect(contract.success.kind).toBe("manual");
  });
});
