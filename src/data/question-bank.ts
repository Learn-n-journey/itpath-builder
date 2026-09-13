/**
 * Generated question bank.
 *
 * Every question here is derived from real curriculum content (recall prompts,
 * practice activities, scenarios, key terms and troubleshooting steps) so the
 * exam generator can draw from hundreds of questions without inventing facts.
 */
import { lessons, topics } from "@/data/static-content";
import {
  learningModules,
  practiceActivities,
  realWorldScenarios,
  recallQuestions,
} from "@/data/learning-content";
import type { Difficulty, MistakeCategory, Question } from "@/lib/app-data/types";

const GENERATED_QUIZ_ID = "quiz-generated-bank";

function make(
  id: string,
  topicId: string,
  certificationId: string,
  type: Question["type"],
  prompt: string,
  choices: string[],
  correctAnswer: string[],
  acceptableAnswers: string[],
  explanation: string,
  difficulty: Difficulty,
  mistakeCategory: MistakeCategory,
  requiresReasoning: boolean,
): Question {
  return {
    id,
    topicId,
    quizId: GENERATED_QUIZ_ID,
    certificationId,
    type,
    prompt,
    choices,
    correctAnswer,
    acceptableAnswers,
    explanation,
    difficulty,
    mistakeCategory,
    requiresReasoning,
  };
}

function distractorTerms(exclude: string, count: number): string[] {
  const pool = lessons
    .flatMap((lesson) => lesson.keyTerms.map((term) => term.term))
    .filter((term) => term.toLowerCase() !== exclude.toLowerCase());
  const unique = [...new Set(pool)];
  const picked: string[] = [];
  let index = exclude.length * 7;
  while (picked.length < count && unique.length > 0) {
    const candidate = unique[index % unique.length] as string;
    if (!picked.includes(candidate)) picked.push(candidate);
    index += 13;
  }
  return picked;
}

function build(): Question[] {
  const out: Question[] = [];

  for (const topic of topics) {
    const cert = topic.certificationId;
    const difficulty = topic.difficulty;

    // Recall prompts become written answers graded on the idea.
    for (const recall of recallQuestions.filter((item) => item.topicId === topic.id)) {
      out.push(
        make(
          `question-gen-${recall.id}`,
          topic.id,
          cert,
          "short_answer",
          recall.prompt,
          [],
          [],
          recall.acceptedConcepts.length ? recall.acceptedConcepts : [recall.explanation],
          recall.explanation,
          difficulty,
          "concept",
          true,
        ),
      );
    }

    // Practice activities are already multiple choice with a single answer.
    const practice = practiceActivities.find((item) => item.topicId === topic.id);
    if (practice) {
      const answer = practice.choices[practice.answerIndex];
      if (answer) {
        out.push(
          make(
            `question-gen-${practice.id}`,
            topic.id,
            cert,
            "multiple_choice",
            practice.prompt,
            practice.choices,
            [answer],
            [],
            practice.explanation,
            difficulty,
            "concept",
            true,
          ),
        );
      }
    }

    // Scenarios become reasoning questions answered in the learner's own words.
    const scenario = realWorldScenarios.find((item) => item.topicId === topic.id);
    if (scenario) {
      out.push(
        make(
          `question-gen-${scenario.id}`,
          topic.id,
          cert,
          "short_answer",
          `${scenario.situation} ${scenario.decisionPrompt}`,
          [],
          [],
          scenario.expectedConcepts,
          scenario.guidance,
          difficulty,
          "diagnosis",
          true,
        ),
      );
    }

    // Key terms become terminology multiple choice.
    const lesson = lessons.find((item) => item.topicId === topic.id);
    lesson?.keyTerms.slice(0, 4).forEach((term, index) => {
      const wrong = distractorTerms(term.term, 3);
      if (wrong.length < 3) return;
      out.push(
        make(
          `question-gen-term-${topic.id}-${index + 1}`,
          topic.id,
          cert,
          "multiple_choice",
          `Which term matches this description? "${term.meaning}"`,
          [term.term, ...wrong],
          [term.term],
          [],
          `${term.term}: ${term.meaning}`,
          difficulty,
          "terminology",
          false,
        ),
      );
    });

    const currentModule = learningModules.find((item) => item.topicId === topic.id);
    if (currentModule) {
      currentModule.commonProblems.slice(0, 2).forEach((problem, index) => {
        const step = currentModule.troubleshooting[0] ?? "Confirm the symptom and scope first.";
        out.push(
          make(
            `question-gen-trouble-${topic.id}-${index + 1}`,
            topic.id,
            cert,
            "troubleshooting",
            `Working on ${topic.title.toLowerCase()}, you suspect: ${problem}. What do you do first, and why?`,
            [],
            [],
            [step, problem],
            step,
            difficulty,
            "diagnosis",
            true,
          ),
        );
      });

      currentModule.practicalKnowledge.slice(0, 1).forEach((item, index) => {
        out.push(
          make(
            `question-gen-practical-${topic.id}-${index + 1}`,
            topic.id,
            cert,
            "short_answer",
            `In practical work on ${topic.title.toLowerCase()}, what does good practice require here: ${item.replace(/\.$/, "")}?`,
            [],
            [],
            [item],
            item,
            difficulty,
            "procedure",
            true,
          ),
        );
      });

      currentModule.interviewQuestions.slice(0, 1).forEach((prompt, index) => {
        const expected = currentModule.howItWorks[0] ?? topic.summary;
        out.push(
          make(
            `question-gen-interview-${topic.id}-${index + 1}`,
            topic.id,
            cert,
            "scenario",
            prompt,
            [],
            [],
            [expected, topic.summary],
            expected,
            difficulty,
            "concept",
            true,
          ),
        );
      });
    }
  }

  return out;
}

export const generatedQuestions: Question[] = build();

export function questionsForCertification(certificationId: string): Question[] {
  return generatedQuestions.filter((question) => question.certificationId === certificationId);
}
