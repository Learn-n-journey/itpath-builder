import { describe, expect, it } from "vitest";

import { activeCoursePack } from "@/content/course-pack";
import { engineHealthChecks, findCycles } from "./engine-health";
import { contentHealth, topicHealthChecks } from "./content-health";

describe("engine diagnostics", () => {
  it("finds a prerequisite loop", () => {
    const cycles = findCycles(new Map([["a", ["b"]], ["b", ["c"]], ["c", ["a"]], ["d", []]]));
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toContain("b");
  });

  it("reports nothing when the graph is a clean tree", () => {
    expect(findCycles(new Map([["a", ["b"]], ["b", []]]))).toEqual([]);
  });

  it("runs against the live course without touching learner data", () => {
    const pack = activeCoursePack();
    const before = JSON.stringify(pack.sections);
    const checks = engineHealthChecks(pack, "2026-01-01T00:00:00.000Z");
    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every((check) => check.area === "engine")).toBe(true);
    expect(checks.every((check) => check.lastRunAt === "2026-01-01T00:00:00.000Z")).toBe(true);
    // The diagnostics are a pure read: the course material is unchanged.
    expect(JSON.stringify(pack.sections)).toBe(before);
  });
});

describe("content health", () => {
  it("fails loudly for a topic that does not exist", () => {
    const checks = topicHealthChecks(activeCoursePack(), "no-such-topic");
    expect(checks[0]?.state).toBe("failed");
  });

  it("gives every real topic a report with an action for each problem", () => {
    const pack = activeCoursePack();
    const report = contentHealth(pack);
    expect(report).toHaveLength(pack.sections.length);
    for (const topic of report) {
      expect(topic.checks.length).toBeGreaterThan(5);
      for (const check of topic.checks) {
        expect(check.label.length).toBeGreaterThan(0);
        expect(check.action.length).toBeGreaterThan(0);
      }
    }
  });

  it("flags a topic with no quiz questions as unable to be completed", () => {
    const pack = activeCoursePack();
    const thin = { ...pack, sectionQuestionPool: () => [] } as typeof pack;
    const checks = engineHealthChecks(thin);
    const impossible = checks.find((check) => check.id === "engine:impossible-progression");
    expect(impossible?.state).toBe("failed");
  });
});
