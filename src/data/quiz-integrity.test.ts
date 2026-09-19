import { describe, expect, it } from "vitest";

import { topics } from "@/data/static-content";
import {
  SECTION_QUIZ_SIZE,
  buildSectionQuiz,
  conceptIdFor,
  getTopicQuestionPool,
} from "@/data/topic-quizzes";
import { STAGE_EXAM_SIZE, getStageExamQuestions, stageExams } from "@/data/stage-exams";
import { validateQuestionSet } from "@/lib/quiz-finalize";

/** A settled generator, so a failure can be run again exactly as it happened. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

describe("every paper handed to a learner is whole and clean", () => {
  it("100 randomly drawn section quizzes hold 20 sound, unique questions", () => {
    const random = seeded(20260919);
    const failures: string[] = [];

    for (let round = 0; round < 100; round += 1) {
      const topic = topics[Math.floor(random() * topics.length)]!;
      const available = getTopicQuestionPool(topic.id).length;
      if (available === 0) continue;
      const paper = buildSectionQuiz(topic.id, random());
      const problems = validateQuestionSet(paper, SECTION_QUIZ_SIZE, conceptIdFor, available);
      if (problems.length > 0) failures.push(`${topic.id}: ${problems.join("; ")}`);
      for (const question of paper) {
        if (question.topicId !== topic.id) failures.push(`${topic.id}: a question came from elsewhere`);
      }
    }

    expect(failures).toEqual([]);
  }, 120000);

  it("100 randomly drawn stage exams hold 50 sound, unique questions", () => {
    const random = seeded(915);
    const failures: string[] = [];

    for (let round = 0; round < 100; round += 1) {
      const exam = stageExams[round % stageExams.length]!;
      const paper = getStageExamQuestions(exam.id, random());
      const problems = validateQuestionSet(paper, STAGE_EXAM_SIZE, conceptIdFor);
      if (problems.length > 0) failures.push(`${exam.id}: ${problems.join("; ")}`);
      const certs = new Set(paper.map((question) => question.topicId));
      if (certs.size < 5) failures.push(`${exam.id}: the paper leans on too few sections`);
    }

    expect(failures).toEqual([]);
  }, 180000);
});
