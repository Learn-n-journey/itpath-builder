import { describe, expect, it } from "vitest";

import { topics } from "@/data/static-content";
import { SECTION_QUIZ_SIZE, drawSectionQuiz, getTopicQuestionPool } from "@/data/topic-quizzes";

describe("section quizzes stay inside their own section", () => {
  it("every drawn question belongs to that section, on every redraw", () => {
    for (const topic of topics) {
      const pool = getTopicQuestionPool(topic.id);
      if (pool.length === 0) continue;
      const poolIds = new Set(pool.map((question) => question.id));

      for (let paper = 0; paper < 8; paper += 1) {
        const drawn = drawSectionQuiz(topic.id, paper * 0.137);
        expect(drawn.length).toBeGreaterThan(0);
        expect(drawn.length).toBeLessThanOrEqual(SECTION_QUIZ_SIZE);
        const ids = new Set(drawn.map((question) => question.id));
        expect(ids.size).toBe(drawn.length);
        for (const question of drawn) {
          expect(question.topicId).toBe(topic.id);
          expect(question.quizId).toBe(`section-quiz-${topic.id}`);
          expect(poolIds.has(question.id)).toBe(true);
        }
      }
    }
  }, 60000);

  it("consecutive papers are not the same set when the pool allows it", () => {
    const wide = topics.filter((topic) => getTopicQuestionPool(topic.id).length >= SECTION_QUIZ_SIZE * 2);
    expect(wide.length).toBeGreaterThan(0);
    for (const topic of wide) {
      const first = drawSectionQuiz(topic.id, 1).map((question) => question.id).join("|");
      const second = drawSectionQuiz(topic.id, 2).map((question) => question.id).join("|");
      expect(first).not.toBe(second);
    }
  }, 60000);
});
