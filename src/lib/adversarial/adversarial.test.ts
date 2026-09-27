/**
 * Permanent regression tests for self-contained domain packages.
 *
 * Workbook-backed packages intentionally keep questions, sources and full
 * lesson content outside the static DomainPackage. Those live materials are
 * covered by the owner/content QA suites; injecting static-package defects
 * into fields that are deliberately empty would be a false test.
 */
import { describe, expect, it } from "vitest";

import { findEntry, registeredKeys } from "@/domain/registry";
import { inspect, injections, measureCoverage, runLoop } from "./harness";
import { DEFECT_CATEGORIES } from "./types";
import type { DomainPackage } from "@/domain/package";

async function loadAll(): Promise<{ key: string; pkg: DomainPackage }[]> {
  const out: { key: string; pkg: DomainPackage }[] = [];
  for (const key of registeredKeys()) {
    const entry = findEntry(key)!;
    out.push({ key, pkg: entry.packageSync ?? (await entry.load!()) });
  }
  return out;
}

function supportsStaticAdversarialQa(pkg: DomainPackage): boolean {
  return pkg.questions.length > 0 && pkg.sources.length > 0 && pkg.lessons.some((lesson) => lesson.body.trim().length > 0);
}

const packages = (await loadAll()).filter(({ pkg }) => supportsStaticAdversarialQa(pkg));

describe("the independent engines catch every kind of sabotage", () => {
  it("covers every defect category with at least one injection", () => {
    for (const category of DEFECT_CATEGORIES) {
      expect(injections.filter((injection) => injection.category === category).length).toBeGreaterThan(0);
    }
  });

  for (const { key, pkg } of packages) {
    it(`detects all injected defects in ${key}`, () => {
      const report = measureCoverage(pkg);
      expect(report.weaknesses).toEqual([]);
      expect(report.percentage).toBe(100);
    }, 120000);

    it(`rejects damage and accepts the repair in ${key}`, () => {
      for (const injection of injections) {
        const loop = runLoop(pkg, injection);
        expect(loop.detectedBeforeCorrection, `${key} ${injection.id} went undetected`).toBe(true);
        expect(loop.cleanAfterCorrection, `${key} ${injection.id} left damage after correction`).toBe(true);
      }
    }, 180000);
  }
});

describe("the active subject stays fit to publish", () => {
  it("has no blocking findings in the IT package", async () => {
    const pkg = await findEntry("it-cybersecurity@1.0.0")!.load!();
    const blocking = inspect(pkg).filter((finding) => finding.severity === "blocking");
    expect(blocking.map((finding) => `${finding.ruleId} ${finding.subjectId}: ${finding.detail}`)).toEqual([]);
  }, 120000);
});
