import { coursePackFromDomainPackage } from "@/content/packs/from-package";
import { AUTO_PATH_CURRICULUM, autoCurriculumTopicId } from "@/content/packs/auto-repair/curriculum";
import { autoRepairDomain } from "@/content/packs/auto-repair/3.7.0/domain";
import type { CoursePack } from "@/content/pack-contract";
import type { DomainPackage } from "@/domain/package";
import type { Question } from "@/lib/app-data/types";
import { ownerQuestionsFor } from "@/lib/owner-question-store";

const SECTION_QUIZ_SIZE = 20;
const STAGE_EXAM_SIZE = 50;

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function shuffled<T>(items: T[], seed: string): T[] {
  let hash = 2166136261;
  for (const char of seed) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
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

export export function autoPathCurriculumPackage(): DomainPackage {
  const groups = [...new Set(AUTO_PATH_CURRICULUM.map((lesson) => lesson.group))];
  const qualificationId = (group: string) => `auto-repair:curriculum-group:${slug(group)}`;
  return {
    manifest: {
      id: "auto-repair", version: "3.7.0", key: "auto-repair@3.7.0", name: "AUTO PATH",
      producedBy: "authored-curriculum", producedAt: new Date(0).toISOString(), status: "active",
      scope: { qualifications: groups.length, sections: AUTO_PATH_CURRICULUM.length, concepts: 0, skills: 0, questions: 0, assessments: groups.length, sources: 0 },
    },
    definition: autoRepairDomain,
    qualifications: groups.map((group) => ({ id: qualificationId(group), title: group, summary: `${group} learning block.`, objectives: [] })),
    sections: AUTO_PATH_CURRICULUM.map((lesson, index) => ({
      id: autoCurriculumTopicId(index + 1), slug: `curriculum-${String(index + 1).padStart(3, "0")}`,
      title: lesson.title, summary: `Learn the ${lesson.title} concepts and apply them in automotive service and diagnosis.`,
      qualificationId: qualificationId(lesson.group), order: index + 1, objectiveIds: [],
    })),
    lessons: AUTO_PATH_CURRICULUM.map((lesson, index) => ({
      sectionId: autoCurriculumTopicId(index + 1), title: lesson.title,
      body: "This lesson is filled from the numbered AUTO PATH workbook when it is synced.",
      definition: "", whyItMatters: "", summary: "", nextSteps: [],
    })),
    concepts: [], skills: [],
    prerequisites: AUTO_PATH_CURRICULUM.slice(1).map((_lesson, index) => ({
      sectionId: autoCurriculumTopicId(index + 2), requiresSectionId: autoCurriculumTopicId(index + 1),
    })),
    questions: [],
    assessments: groups.map((group) => ({
      id: `auto-repair:assessment:${slug(group)}`, coversQualificationIds: [qualificationId(group)],
      title: `${group} assessment`, questionCount: STAGE_EXAM_SIZE, passPercent: 80, objectiveIds: [],
    })),
    sources: [], rules: [], assessmentSizes: { sectionQuiz: SECTION_QUIZ_SIZE, stageExam: STAGE_EXAM_SIZE },
  };
}

export function autoPathCurriculumPack(): CoursePack {
  const base = coursePackFromDomainPackage(autoPathCurriculumPackage());
  const topicIds = base.sections.map((section) => section.id);
  const poolFor = (topicId: string): Question[] => ownerQuestionsFor(topicId) ?? [];
  const drawFor = (topicId: string, nonce = 0) => shuffled(poolFor(topicId), `${topicId}:${nonce}`).slice(0, SECTION_QUIZ_SIZE);
  return {
    ...base,
    sectionQuiz: (topicId, attempt = 0) => drawFor(topicId, attempt),
    sectionQuestionPool: poolFor,
    sectionQuizDraw: drawFor,
    stageExams: base.stageExams.map((exam) => ({ ...exam, questions: topicIds.flatMap(poolFor) })),
    stageExamQuestions: (examId, nonce = 0) => shuffled(topicIds.flatMap(poolFor), `${examId}:${nonce}`).slice(0, STAGE_EXAM_SIZE),
  };
}
