/**
 * Certification and topic quizzes assembled from the generated question bank.
 * No question text is duplicated: quizzes reference existing question ids and
 * the runner is given the generated bank as its question source.
 */
import { certifications, topics } from "@/data/static-content";
import { generatedQuestions } from "@/data/question-bank";
import type { Question, Quiz } from "@/lib/app-data/types";

const CHUNK = 12;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) out.push(items.slice(index, index + size));
  return out;
}

function build(): Quiz[] {
  const out: Quiz[] = [];

  for (const certification of certifications) {
    const certTopics = topics.filter((topic) => topic.certificationId === certification.id);
    if (certTopics.length === 0) continue;

    for (const topic of certTopics) {
      const topicQuestions = generatedQuestions.filter((question) => question.topicId === topic.id);
      chunk(topicQuestions, CHUNK).forEach((set, index) => {
        if (set.length < 4) return;
        out.push({
          id: `quiz-topic-${topic.id.replace(/^topic-/, "")}-${index + 1}`,
          title: `${topic.title} — set ${index + 1}`,
          description: `${set.length} questions on ${topic.title.toLowerCase()}, drawn from the lesson, its key terms and its troubleshooting steps.`,
          topicIds: [topic.id],
          questionIds: set.map((question) => question.id),
          kind: "general",
        });
      });
    }

    const certQuestions = generatedQuestions.filter((question) => question.certificationId === certification.id);
    if (certQuestions.length >= 10) {
      chunk(certQuestions, 20).forEach((set, index) => {
        if (set.length < 10) return;
        out.push({
          id: `quiz-cert-${certification.id.replace(/^cert-/, "")}-${index + 1}`,
          title: `${certification.title} mixed review ${index + 1}`,
          description: `${set.length} mixed questions spanning the ${certification.title} topics you have available.`,
          topicIds: [...new Set(set.map((question) => question.topicId))],
          questionIds: set.map((question) => question.id),
          kind: "general",
        });
      });
    }
  }

  return out;
}

export const certQuizzes: Quiz[] = build();

/** Question source the runner needs for these quizzes. */
export const certQuizQuestions: Question[] = generatedQuestions;
