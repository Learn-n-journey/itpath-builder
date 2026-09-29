import { describe, expect, it } from "vitest";
import type { Lab } from "@/lib/app-data/types";
import { simulatorLabContract } from "./lab-environments";

function lab(overrides: Partial<Lab> = {}): Lab {
  return {
    id:"lab-test-unregistered",
    topicId:"topic-command-line-fundamentals",
    title:"Run a PowerShell command and enable Bluetooth",
    category:"powershell",
    objective:"Run commands, restore network connectivity, free storage, and turn on Bluetooth.",
    prerequisites:["Command Line Fundamentals"],
    difficulty:"standard",
    estimatedMinutes:30,
    environment:"Windows PowerShell, Android, Wi-Fi, storage and Bluetooth.",
    instructions:["Run Get-Service.","Turn on Bluetooth.","Connect to Wi-Fi.","Free storage."],
    expectedResult:"Commands run, Bluetooth enabled, network online, storage healthy.",
    checklist:[{id:"check-1",label:"Completed",points:100}],
    reflectionPrompt:"What did you verify?",
    masteryScore:100,
    ...overrides,
  };
}

describe("simulator Lab verification contracts", () => {
  it("fails closed when descriptive text sounds automatically verifiable", () => {
    const contract=simulatorLabContract(lab());
    expect(contract.supported).toBe(false);
    expect(contract.success.kind).toBe("manual");
    expect(contract.minimumRelevantActions).toBe(0);
  });

  it("does not let generated wording create simulator mastery evidence", () => {
    const contract=simulatorLabContract(lab({
      id:"lab-generated-fault-drill",
      title:"Bluetooth storage network command fault drill",
      objective:"Enable Bluetooth and restore connectivity with terminal commands.",
    }));
    expect(contract.supported).toBe(false);
    expect(contract.requirement).toContain("no authored simulator verification contract");
  });
});
