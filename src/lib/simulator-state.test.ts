import { describe, expect, it } from "vitest";

import { simulatorStorageKey } from "@/lib/simulator-state";
import { simulatorLabContract } from "@/lib/lab-environments";

describe("simulator persistence", () => {
  it("keeps simulator keys separate for each account and guest", () => {
    expect(simulatorStorageKey("virtual-pc", "alice")).not.toBe(simulatorStorageKey("virtual-pc", "bob"));
    expect(simulatorStorageKey("virtual-pc", null)).toContain(":guest:");
    expect(simulatorStorageKey("virtual-pc", "alice")).toContain(":v2");
  });

  it("fails closed when a lab has no explicit simulator contract", () => {
    const contract = simulatorLabContract({
      id: "unregistered",
      title: "Unregistered",
      topicId: "topic-test",
      category: "windows",
      description: "test",
      instructions: [],
      verification: [],
    } as never);
    expect(contract.supported).toBe(false);
    expect(contract.success.kind).toBe("manual");
  });
});
