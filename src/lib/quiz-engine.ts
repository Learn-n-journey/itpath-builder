import type { Question, QuizAttempt, QuizQuestionResult } from "./app-data/types";

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }
  return result;
}

export function createQuizAttempt(
  quizId: string,
  questions: Question[],
  previousAttemptId?: string,
): QuizAttempt {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    quizId,
    status: "in_progress",
    questionOrder: shuffle(questions.map((question) => question.id)),
    choiceOrder: Object.fromEntries(
      questions
        .filter((question) => question.choices.length > 0)
        .map((question) => [question.id, shuffle(question.choices)]),
    ),
    responses: {},
    results: [],
    score: 0,
    total: questions.length,
    correct: 0,
    incorrect: 0,
    weakTopicIds: [],
    mistakeCategories: [],
    recommendedTopicIds: [],
    ...(previousAttemptId ? { previousAttemptId } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

function normalize(value: string): string {
  return value.toLowerCase().trim().replace(/[.,!?;:'"`]/g, "").replace(/\s+/g, " ");
}

export function isQuestionCorrect(question: Question, response: string[]): boolean {
  if (question.type === "multiple_choice" || question.type === "scenario" || question.type === "troubleshooting") {
    return response.length === 1 && response[0] === question.correctAnswer[0];
  }
  if (question.type === "multiple_response") {
    return (
      response.length === question.correctAnswer.length &&
      question.correctAnswer.every((answer) => response.includes(answer))
    );
  }
  const answer = normalize(response[0] ?? "");
  return question.acceptableAnswers.some((accepted) => normalize(accepted) === answer);
}

export function scoreQuiz(questions: Question[], responses: Record<string, string[]>) {
  const results: QuizQuestionResult[] = questions.map((question) => ({
    questionId: question.id,
    topicId: question.topicId,
    correct: isQuestionCorrect(question, responses[question.id] ?? []),
    response: responses[question.id] ?? [],
  }));
  const incorrectResults = results.filter((result) => !result.correct);
  const incorrectQuestions = incorrectResults
    .map((result) => questions.find((question) => question.id === result.questionId))
    .filter((question): question is Question => Boolean(question));
  return {
    results,
    correct: results.length - incorrectResults.length,
    incorrect: incorrectResults.length,
    weakTopicIds: [...new Set(incorrectQuestions.map((question) => question.topicId))],
    mistakeCategories: [...new Set(incorrectQuestions.map((question) => question.mistakeCategory))],
  };
}