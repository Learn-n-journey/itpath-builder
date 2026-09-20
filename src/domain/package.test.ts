/**
 * The shipped subject has to satisfy the same package contract a generated
 * one does, and the independent package audit has to pass on it. If this test
 * fails, the material and the manifest have drifted apart.
 */
import { describe, expect, it } from "vitest";

import { buildItPackage } from "@/content/packs/it-package";
import { auditPackage } from "@/lib/domain/package-audit";
import { ACTIVE_PACKAGE, activeEntry, registry } from "@/domain/registry";
import { domainId, packageKey } from "@/domain/package";
import { autoRepairPackage } from "@/content/packs/auto-repair/3.7.0/package";

describe("domain packages", () => {
  it("resolves the active package from the registry", () => {
    expect(registry[ACTIVE_PACKAGE]).toBeDefined();
    expect(activeEntry().definition.id).toBe("it-cybersecurity");
    expect(activeEntry().manifest.key).toBe(packageKey("it-cybersecurity", "1.0.0"));
  });

  it("builds a complete IT package with stable ids", () => {
    const pkg = buildItPackage();
    expect(pkg.sections.length).toBeGreaterThan(100);
    expect(pkg.lessons.length).toBeGreaterThan(100);
    expect(pkg.concepts.length).toBeGreaterThan(100);
    expect(pkg.questions.length).toBeGreaterThan(1000);
    expect(pkg.sources.length).toBeGreaterThan(100);
    expect(pkg.manifest.scope.sections).toBe(pkg.sections.length);

    const first = pkg.sections[0]!;
    expect(first.id).toBe(domainId("it-cybersecurity", "section", first.slug));
    expect(new Set(pkg.sections.map((section) => section.id)).size).toBe(pkg.sections.length);
  }, 30_000);

  it("passes the independent package audit with nothing blocking", () => {
    const audit = auditPackage(buildItPackage());
    expect(audit.findings.filter((finding) => finding.severity === "blocking")).toEqual([]);
    expect(audit.passed).toBe(true);
  }, 30_000);

  it("gives every active lesson at least one written source", () => {
    for (const pkg of [buildItPackage(), autoRepairPackage]) {
      const sourcedSections = new Set(
        pkg.sources.filter((source) => source.kind === "reading").map((source) => source.sectionId),
      );
      const missing = pkg.lessons.filter((lesson) => !sourcedSections.has(lesson.sectionId));
      expect(missing.map((lesson) => lesson.title), `${pkg.manifest.name} has lessons without sources`).toEqual([]);
    }
  }, 30_000);
});
