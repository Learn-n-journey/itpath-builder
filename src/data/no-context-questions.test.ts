import { describe, expect, it } from "vitest";

import { topics } from "@/data/static-content";
import { getTaggedTopicPool } from "@/data/topic-quizzes";
import { masteryCheckPool } from "@/data/mastery-checks";

/**
 * A question that never states the problem being worked on cannot have one
 * defensible answer. Context-free step wording once reached learners
 * ("You have just done this: ... What does the evidence so far point you to
 * next?") and must never come back, in any section, in any check. Any
 * "what next" question must carry the reported problem in its prompt.
 */
const RETIRED_WORDING = /you have just done this/i;
const STEP_QUESTION = /what comes next|point you to next/i;
const STATED_PROBLEM = /problem|report|fault|symptom|error|issue|user says|reports this/i;

function contextProblems(id: string, prompt: string): string[] {
  const problems: string[] = [];
  if (RETIRED_WORDING.test(prompt)) problems.push(`${id}: retired no-context wording: ${prompt}`);
  if (STEP_QUESTION.test(prompt) && !STATED_PROBLEM.test(prompt)) {
    problems.push(`${id}: step question without a stated problem: ${prompt}`);
  }
  return problems;
}

describe("no context-free questions", () => {
  it(
    "no section question asks about a step without stating the problem",
    () => {
      const problems: string[] = [];
      for (const topic of topics) {
        for (const item of getTaggedTopicPool(topic.id)) {
          problems.push(...contextProblems(item.question.id, item.question.prompt));
        }
      }
      expect(problems).toEqual([]);
    },
    120000,
  );

  it(
    "no mastery check asks about a step without stating the problem",
    () => {
      const problems: string[] = [];
      for (const topic of topics) {
        for (const kind of ["recall", "understanding", "application", "troubleshooting"] as const) {
          for (const item of masteryCheckPool(topic.id, kind)) {
            problems.push(...contextProblems(item.id, item.prompt));
          }
        }
      }
      expect(problems).toEqual([]);
    },
    60000,
  );
});
