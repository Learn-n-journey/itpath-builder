import { describe, expect, it } from "vitest";

import { topics } from "@/data/static-content";
import { drawSectionQuiz } from "@/data/topic-quizzes";
import { getStageExamQuestions, stageExams } from "@/data/stage-exams";
import { questionIssues } from "@/lib/question-quality";

function check(question: { id: string; prompt: string }, where: string) {
  const issues = questionIssues(question as never);
  if (issues.length > 0) {
    throw new Error(`${where} ${question.id}: ${issues.join("; ")}\n${question.prompt}`);
  }
}

describe("every drawn question has one correct answer and believable wrong ones", () => {
  it("holds for section quizzes across redraws", () => {
    for (const topic of topics) {
      for (let paper = 0; paper < 5; paper += 1) {
        for (const question of drawSectionQuiz(topic.id, paper * 0.211)) {
          check(question, `section ${topic.id}`);
        }
      }
    }
  });

  it("holds for stage exams across redraws", () => {
    for (const exam of stageExams) {
      for (let paper = 0; paper < 5; paper += 1) {
        for (const question of getStageExamQuestions(exam.id, paper * 0.317)) {
          check(question, `stage ${exam.id}`);
        }
      }
    }
  });
});
