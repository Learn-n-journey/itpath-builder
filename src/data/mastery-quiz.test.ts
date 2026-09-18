import { describe, expect, it } from "vitest";

import { topics } from "@/data/static-content";
import {
  SECTION_QUIZ_SIZE,
  buildSectionQuiz,
  getTaggedTopicPool,
  topicConceptLookup,
} from "@/data/topic-quizzes";
import { conceptStats } from "@/lib/concept-mastery";
import { reviewQuizSet } from "@/lib/quiz-validation";
import type { QuizAttempt } from "@/lib/app-data/types";

const wideTopics = topics.filter((topic) => getTaggedTopicPool(topic.id).length >= SECTION_QUIZ_SIZE * 3);

function attempt(quizId: string, results: { questionId: string; topicId: string; correct: boolean }[], day: number): QuizAttempt {
  const at = new Date(Date.UTC(2026, 0, day)).toISOString();
  return {
    id: `attempt-${quizId}-${day}`,
    quizId,
    status: "submitted",
    questionOrder: results.map((entry) => entry.questionId),
    choiceOrder: {},
    responses: {},
    results: results.map((entry) => ({ ...entry, response: [] })),
    score: 0,
    total: results.length,
    correct: results.filter((entry) => entry.correct).length,
    incorrect: results.filter((entry) => !entry.correct).length,
    weakTopicIds: [],
    mistakeCategories: [],
    recommendedTopicIds: [],
    createdAt: at,
    updatedAt: at,
    submittedAt: at,
  };
}

describe("mastery driven section quizzes", () => {
  it("passes its own checks before it is shown", () => {
    for (const topic of topics) {
      const questions = buildSectionQuiz(topic.id, 0.42);
      if (questions.length === 0) continue;
      const pool = getTaggedTopicPool(topic.id);
      const tagged = questions.map((question) => {
        const match = pool.find((item) => item.question.id === question.id);
        expect(match, `${question.id} is not from ${topic.id}`).toBeTruthy();
        return { question, tags: match!.tags };
      });
      const report = reviewQuizSet(tagged, Math.min(SECTION_QUIZ_SIZE, questions.length));
      expect(report.replace, `${topic.id} still has questions that should be replaced`).toEqual([]);
    }
  }, 120000);

  it("asks far less about ideas already proven, and reinforces shaky ones", () => {
    const topic = wideTopics[0];
    expect(topic).toBeTruthy();
    const topicId = topic!.id;
    const conceptOf = topicConceptLookup(topicId);
    const first = buildSectionQuiz(topicId, 0.11);
    expect(first).toHaveLength(SECTION_QUIZ_SIZE);

    const proven = first.slice(0, 10);
    const shaky = first.slice(10);
    const answers = [
      ...proven.map((question) => ({ questionId: question.id, topicId, correct: true })),
      ...shaky.map((question) => ({ questionId: question.id, topicId, correct: false })),
    ];
    const attempts = [1, 2, 3].map((day) => attempt(`section-quiz-${topicId}`, answers, day));
    const stats = conceptStats(attempts, conceptOf);

    const next = buildSectionQuiz(topicId, 0.11, stats);
    const provenConcepts = new Set(proven.map((question) => conceptOf(question.id)));
    const shakyConcepts = new Set(shaky.map((question) => conceptOf(question.id)));
    const nextConcepts = next.map((question) => conceptOf(question.id));

    const provenAgain = nextConcepts.filter((concept) => concept && provenConcepts.has(concept)).length;
    const shakyAgain = nextConcepts.filter((concept) => concept && shakyConcepts.has(concept)).length;

    expect(shakyAgain).toBeGreaterThan(provenAgain);
    expect(provenAgain).toBeLessThanOrEqual(3);
  }, 60000);
});
