import { matchesConcept } from "./fuzzy-match";
import type { Question, QuizAttempt, QuizQuestionResult } from "./app-data/types";

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex] as T, result[index] as T];
  }
  return result;
}

/**
 * Only trust a saved answer order that still belongs to this question.
 *
 * A stored attempt can outlive the question it was built from. If the saved
 * order is not exactly this question's own choices, fall back to the question
 * so a learner never sees one question's prompt above another's answers.
 */
export function safeChoiceOrder(question: Question, saved: string[] | undefined): string[] {
  if (!saved || saved.length !== question.choices.length) return question.choices;
  const own = new Set(question.choices);
  return saved.every((choice) => own.has(choice)) ? saved : question.choices;
}

/**
 * Mix the set instead of just shuffling it.
 *
 * A plain shuffle can still deal out five recall questions on one topic in a
 * row, and blocked practice feels easier while teaching less. This spreads the
 * set so neighbouring questions differ in how they ask and what they cover,
 * which is where the benefit of interleaving actually comes from.
 */
export function mixQuestions(questions: Question[]): Question[] {
  const remaining = shuffle(questions);
  const out: Question[] = [];

  while (remaining.length > 0) {
    const previous = out[out.length - 1];
    let index = 0;
    if (previous) {
      const best = remaining.findIndex(
        (question) => question.type !== previous.type && question.topicId !== previous.topicId,
      );
      const fallback = remaining.findIndex(
        (question) => question.type !== previous.type || question.topicId !== previous.topicId,
      );
      // Only look a little way ahead, so the set stays varied without becoming
      // a strict rotation the learner can predict.
      if (best > 0 && best <= 3) index = best;
      else if (fallback > 0 && fallback <= 3) index = fallback;
    }
    out.push(remaining.splice(index, 1)[0]!);
  }

  return out;
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
    questionOrder: mixQuestions(questions).map((question) => question.id),
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

/**
 * Written answers are graded on the idea, not on exact wording: an answer
 * counts when it expresses enough of an accepted answer's meaning.
 */
export function isQuestionCorrect(question: Question, response: string[]): boolean {
  const hasChoices = question.choices.length > 0;
  if (
    hasChoices &&
    (question.type === "multiple_choice" || question.type === "scenario" || question.type === "troubleshooting")
  ) {
    return response.length === 1 && response[0] === question.correctAnswer[0];
  }
  if (question.type === "multiple_response") {
    return (
      response.length === question.correctAnswer.length &&
      question.correctAnswer.every((answer) => response.includes(answer))
    );
  }
  const written = response[0] ?? "";
  if (!written.trim()) return false;
  if (question.acceptableAnswers.some((accepted) => normalize(accepted) === normalize(written))) {
    return true;
  }
  return matchesConcept(written, question.acceptableAnswers, 0.5);
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