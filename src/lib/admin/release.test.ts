import { describe, expect, it } from "vitest";

import { canRollback, canTransition, contentHash, liveMatchesVersion, rollbackTarget } from "./release";
import type { ContentVersion } from "./types";

const version = (part: Partial<ContentVersion>): ContentVersion => ({
  id: part.id ?? "v1",
  domain: "it-cybersecurity",
  topicId: "topic-1",
  kind: "quiz",
  contentHash: part.contentHash ?? "aaaa",
  status: part.status ?? "imported",
  sourceFile: "",
  note: null,
  validation: part.validation ?? { passed: true, blocking: 0, warnings: 0, findings: [] },
  importedAt: part.importedAt ?? "2026-01-01T00:00:00.000Z",
  validatedAt: null,
  approvedAt: part.approvedAt ?? null,
  publishedAt: part.publishedAt ?? null,
  supersededAt: null,
  rolledBackAt: null,
});

describe("content release gate", () => {
  it("hashes by content, not by time", () => {
    expect(contentHash({ a: 1, b: [2, 3] })).toBe(contentHash({ b: [2, 3], a: 1 }));
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });

  it("imported content cannot jump straight to live", () => {
    expect(canTransition("imported", "live", { owner: true }).ok).toBe(false);
  });

  it("failed validation blocks publication at every step", () => {
    for (const target of ["validated", "preview", "approved", "live"] as const) {
      const result = canTransition(target === "validated" ? "imported" : "validated", target, {
        validationPassed: false,
        owner: true,
      });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("Validation failed");
    }
  });

  it("approving and publishing needs the owner", () => {
    expect(canTransition("validated", "approved", { validationPassed: true }).ok).toBe(false);
    expect(canTransition("validated", "approved", { validationPassed: true, owner: true }).ok).toBe(true);
    expect(canTransition("approved", "live", { validationPassed: true, owner: true }).ok).toBe(true);
  });

  it("rolls back to the last known-good version and refuses when there is none", () => {
    const only = [version({ id: "live", status: "live", publishedAt: "2026-02-01T00:00:00.000Z" })];
    expect(canRollback(only).ok).toBe(false);
    expect(canRollback(only).reason).toContain("no earlier known-good version");

    const withPrevious = [
      ...only,
      version({ id: "old", status: "superseded", contentHash: "bbbb", publishedAt: "2026-01-05T00:00:00.000Z" }),
      version({ id: "bad", status: "rejected", validation: { passed: false, blocking: 2, warnings: 0, findings: [] } }),
    ];
    expect(canRollback(withPrevious).ok).toBe(true);
    expect(rollbackTarget(withPrevious)?.id).toBe("old");
  });

  it("refuses a rollback when nothing is live", () => {
    expect(canRollback([version({ status: "superseded" })]).ok).toBe(false);
  });

  it("detects live content that no longer matches the imported version", () => {
    const live = version({ status: "live", contentHash: "aaaa" });
    expect(liveMatchesVersion("aaaa", live)).toBe(true);
    expect(liveMatchesVersion("cccc", live)).toBe(false);
    expect(liveMatchesVersion(null, live)).toBe(false);
  });
});
