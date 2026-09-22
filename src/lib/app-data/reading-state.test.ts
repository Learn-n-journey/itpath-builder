import { describe, expect, it } from "vitest";
import { createDefaultUserData } from "./defaults";
import { userMutations } from "./mutations";
import { sanitizeUser } from "./storage";

describe("reading and remediation state", () => {
  it("stores positions independently per topic and survives sanitization", () => {
    let user = createDefaultUserData();
    user = userMutations.setReadingPosition(user, { topicId: "a", sectionId: "a:lesson:first", offset: .4, contentFingerprint: "one", updatedAt: "2026-01-01", reviewedSectionIds: ["a:lesson:first"] });
    user = userMutations.setReadingPosition(user, { topicId: "b", sectionId: "b:lesson:first", offset: .7, contentFingerprint: "two", updatedAt: "2026-01-02", reviewedSectionIds: [] });
    const loaded = sanitizeUser(user);
    expect(loaded.readingPositions["a"]?.offset).toBe(.4);
    expect(loaded.readingPositions["b"]?.offset).toBe(.7);
  });

  it("records remediation without changing mastery evidence", () => {
    const user = createDefaultUserData();
    const next = userMutations.addRemediationEvent(user, { id: "r", topicId: "a", conceptId: "c", lessonSectionId: "s", sourceKind: "quiz", sourceItemId: "q", createdAt: "2026-01-01" });
    expect(next.remediationEvents).toHaveLength(1);
    expect(next.quizAttempts).toEqual([]);
    expect(next.quizPasses).toEqual({});
    expect(next.topicProgress).toEqual({});
  });
});