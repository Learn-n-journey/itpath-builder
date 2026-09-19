import { describe, expect, it } from "vitest";

import { topics } from "@/data/static-content";
import { runContentAudit } from "./audit";
import { getRule, qualityRules } from "./rules";

describe("the rule book is machine readable", () => {
  it("every rule has a stable, unique id and a plain statement", () => {
    const ids = new Set<string>();
    for (const rule of qualityRules) {
      expect(rule.id).toMatch(/^[a-z]+\.[a-z0-9-]+$/);
      expect(ids.has(rule.id)).toBe(false);
      ids.add(rule.id);
      expect(rule.says.length).toBeGreaterThan(20);
      expect(getRule(rule.id)).toBe(rule);
    }
  });
});

describe("the auditor holds the material to the rule book", () => {
  // A sample keeps the suite quick; the gate script audits everything.
  const sample = topics.filter((_, index) => index % 12 === 0).map((topic) => topic.id);

  it("reports nothing blocking on a sample of sections", () => {
    const report = runContentAudit({ topicIds: sample, papersEach: 1 });
    const blocking = report.findings.filter((finding) => finding.severity === "blocking");
    expect(blocking.map((finding) => `${finding.ruleId} ${finding.subjectId}: ${finding.detail}`)).toEqual([]);
    expect(report.scope.topics).toBe(sample.length);
    expect(report.passed).toBe(true);
  }, 120000);

  it("names a known rule and a stable subject on every finding", () => {
    const report = runContentAudit({ topicIds: sample, papersEach: 1 });
    for (const finding of report.findings) {
      expect(getRule(finding.ruleId)).toBeDefined();
      expect(finding.subjectId).toMatch(/^(topic|question|quiz|exam):/);
      expect(finding.detail.length).toBeGreaterThan(3);
    }
  }, 120000);
});
