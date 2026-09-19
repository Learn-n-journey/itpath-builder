import { describe, expect, it } from "vitest";

import { topics } from "@/data/static-content";
import { getTaggedTopicPool } from "@/data/topic-quizzes";
import { masteryCheckPool } from "@/data/mastery-checks";

/**
 * A question that never states the problem being worked on cannot have one
 * defensible answer. This wording was once generated for step-order items
 * ("You have just done this: ... What does the evidence so far point you to
 * next?") and must never come back, in any section, in any check.
 */
const NO_CONTEXT_PATTERNS: RegExp[] = [
  /you have just done this/i,
  /nothing conclusive/i,
  /evidence so far point/i,
];

describe("no context-free questions", () => {
  it("no section question asks about a step without stating the problem", () => {
    for (const topic of topics) {
      for (const item of getTaggedTopicPool(topic.id)) {
        for (const pattern of NO_CONTEXT_PATTERNS) {
          expect(
            pattern.test(item.question.prompt),
            `${item.question.id}: ${item.question.prompt}`,
          ).toBe(false);
        }
      }
    }
  });

  it("no mastery check asks about a step without stating the problem", () => {
    for (const topic of topics) {
      for (const kind of ["recall", "understanding", "application", "troubleshooting"] as const) {
        for (const item of masteryCheckPool(topic.id, kind)) {
          for (const pattern of NO_CONTEXT_PATTERNS) {
            expect(pattern.test(item.prompt), `${item.id}: ${item.prompt}`).toBe(false);
          }
        }
      }
    }
  });
});
