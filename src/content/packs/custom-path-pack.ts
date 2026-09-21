/**
 * The course pack for a path created from Settings.
 *
 * A created path ships with the architecture and no material: its sections are
 * the titles the owner typed, and every lesson, question, try-it item and lab
 * arrives from the path's spreadsheet folder. Nothing subject specific from IT
 * PATH or AUTO PATH — no games, no explorers, no feeds — is carried in.
 */
import { coursePackFromDomainPackage } from "@/content/packs/from-package";
import type { CoursePack } from "@/content/pack-contract";
import type { DomainPackage } from "@/domain/package";
import type { Question } from "@/lib/app-data/types";
import { ownerQuestionsFor } from "@/lib/owner-question-store";
import {
  PATH_SIZES,
  PATH_VERSION,
  pathCertificationId,
  pathDefinition,
  pathKey,
  pathTopicId,
  type LearningPath,
} from "@/lib/learning-paths-shared";

function shuffled<T>(items: T[], seed: string): T[] {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const random = () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap] as T, copy[index] as T];
  }
  return copy;
}

/** The empty package behind a created path: sections, one certificate, no content. */
export function customPathPackage(path: LearningPath): DomainPackage {
  const definition = pathDefinition(path);
  const certificationId = pathCertificationId(path.slug);
  return {
    manifest: {
      id: path.slug,
      version: PATH_VERSION,
      key: pathKey(path.slug),
      name: definition.appName,
      producedBy: "created-in-settings",
      producedAt: new Date(0).toISOString(),
      status: "active",
      scope: {
        qualifications: 1,
        sections: path.topics.length,
        concepts: 0,
        skills: 0,
        questions: 0,
        assessments: 1,
        sources: 0,
      },
    },
    definition,
    qualifications: [
      {
        id: certificationId,
        title: `${path.name.trim()} certificate`,
        summary: `The final exam for the ${definition.appName} path.`,
        objectives: [],
      },
    ],
    sections: path.topics.map((title, index) => ({
      id: pathTopicId(path.slug, index + 1),
      slug: `section-${index + 1}`,
      title,
      summary: "",
      qualificationId: certificationId,
      order: index + 1,
      objectiveIds: [],
    })),
    lessons: [],
    concepts: [],
    skills: [],
    prerequisites: path.topics.slice(1).map((_title, index) => ({
      sectionId: pathTopicId(path.slug, index + 2),
      requiresSectionId: pathTopicId(path.slug, index + 1),
    })),
    questions: [],
    assessments: [
      {
        id: `${path.slug}-final-exam`,
        coversQualificationIds: [certificationId],
        title: `${path.name.trim()} final exam`,
        questionCount: PATH_SIZES.stageExam,
        passPercent: 80,
        objectiveIds: [],
      },
    ],
    sources: [],
    rules: [],
    assessmentSizes: { ...PATH_SIZES },
  };
}

/**
 * The pack the app runs. Quizzes read the path's spreadsheet questions live, so
 * a sync fills the empty path without a rebuild.
 */
export function customPathPack(path: LearningPath): CoursePack {
  const base = coursePackFromDomainPackage(customPathPackage(path));
  const topicIds = base.sections.map((section) => section.id);

  const poolFor = (topicId: string): Question[] => ownerQuestionsFor(topicId) ?? [];
  const drawFor = (topicId: string, nonce = 0): Question[] =>
    shuffled(poolFor(topicId), `${topicId}:${nonce}`).slice(0, PATH_SIZES.sectionQuiz);

  return {
    ...base,
    sectionQuiz: (topicId, attempt = 0) => drawFor(topicId, attempt),
    sectionQuestionPool: poolFor,
    sectionQuizDraw: drawFor,
    stageExams: base.stageExams.map((exam) => ({
      ...exam,
      questions: topicIds.flatMap(poolFor),
    })),
    stageExamQuestions: (examId, nonce = 0) =>
      shuffled(topicIds.flatMap(poolFor), `${examId}:${nonce}`).slice(0, PATH_SIZES.stageExam),
  };
}
