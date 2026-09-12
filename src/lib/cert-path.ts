/**
 * Certification-centred study path.
 *
 * The path is organised by certification and, inside each certification, by how
 * demanding the material is: foundations first, then core skills, then advanced
 * work. Nothing here depends on calendar months, weeks or years.
 */
import { assignments, certificationObjectives, certifications, resources, topics } from "@/data/static-content";
import { generatedQuestions } from "@/data/question-bank";
import { newSeed, shuffleWithSeed } from "@/lib/shuffle";
import { EXAM_PREP_MINUTES, totalStudyMinutes } from "@/lib/study-time";
import type { Assignment, Certification, Difficulty, Question, Quiz, Resource, Topic } from "@/lib/app-data/types";

export { newSeed };

export type StageId = "foundation" | "core" | "advanced";

export const stageOrder: StageId[] = ["foundation", "core", "advanced"];

export const stageLabels: Record<StageId, string> = {
  foundation: "Start here",
  core: "Core skills",
  advanced: "Advanced",
};

export const stageDescriptions: Record<StageId, string> = {
  foundation: "Plain-language groundwork. Begin here if the certification is new to you.",
  core: "The main body of the certification: the skills the exam tests most.",
  advanced: "Harder material that assumes the earlier work is solid.",
};

const stageForDifficulty: Record<Difficulty, StageId> = {
  gentle: "foundation",
  standard: "core",
  challenging: "advanced",
};

export const certificationLevelLabels: Record<NonNullable<Certification["level"]>, string> = {
  core: "Entry level",
  infrastructure: "Infrastructure",
  security: "Security",
  advanced: "Advanced",
};

export const certificationLevelOrder: Array<NonNullable<Certification["level"]>> = [
  "core",
  "infrastructure",
  "security",
  "advanced",
];

/** Topics that belong to a certification, directly or through its objectives. */
export function certificationTopics(certificationId: string): Topic[] {
  const direct = topics.filter((topic) => topic.certificationId === certificationId);
  if (direct.length > 0) return sortByStage(direct);
  const linked = new Set(
    certificationObjectives
      .filter((objective) => objective.certificationId === certificationId)
      .flatMap((objective) => objective.topicIds ?? []),
  );
  return sortByStage(topics.filter((topic) => linked.has(topic.id)));
}

function stageRank(topic: Topic): number {
  return stageOrder.indexOf(stageForDifficulty[topic.difficulty]);
}

function sortByStage(list: Topic[]): Topic[] {
  return [...list].sort((a, b) => stageRank(a) - stageRank(b) || a.title.localeCompare(b.title));
}

export interface CertificationStage {
  id: StageId;
  label: string;
  description: string;
  topics: Topic[];
}

export function certificationStages(certificationId: string): CertificationStage[] {
  const list = certificationTopics(certificationId);
  return stageOrder
    .map((id) => ({
      id,
      label: stageLabels[id],
      description: stageDescriptions[id],
      topics: list.filter((topic) => stageForDifficulty[topic.difficulty] === id),
    }))
    .filter((stage) => stage.topics.length > 0);
}

export interface StudyIndex {
  topics: Topic[];
  watch: Resource[];
  read: Resource[];
  totalMinutes: number;
}

/** Study, reading and watching material for one certification. */
export function certificationStudyIndex(certificationId: string): StudyIndex {
  const list = certificationTopics(certificationId);
  const topicIds = new Set(list.map((topic) => topic.id));
  const relevant = resources.filter(
    (resource) =>
      resource.certificationId === certificationId ||
      resource.topicIds.some((id) => topicIds.has(id)),
  );
  return {
    topics: list,
    watch: relevant.filter((resource) => resource.kind === "video"),
    read: relevant.filter((resource) => resource.kind !== "video"),
    totalMinutes: totalStudyMinutes(list) + (list.length > 0 ? EXAM_PREP_MINUTES : 0),
  };
}

/** Every question available to a certification's exam generator. */
export function certificationQuestionPool(certificationId: string): Question[] {
  const direct = generatedQuestions.filter((question) => question.certificationId === certificationId);
  if (direct.length > 0) return direct;
  const topicIds = new Set(certificationTopics(certificationId).map((topic) => topic.id));
  return generatedQuestions.filter((question) => topicIds.has(question.topicId));
}

export interface GeneratedExam {
  quiz: Quiz;
  questions: Question[];
}

/** Builds a fresh randomised exam. The same seed always produces the same exam. */
export function generateExam(
  certification: Certification,
  seed: number,
  count = 20,
): GeneratedExam | null {
  const pool = certificationQuestionPool(certification.id);
  if (pool.length === 0) return null;
  const picked = shuffleWithSeed(pool, seed).slice(0, Math.min(count, pool.length));
  const quiz: Quiz = {
    id: `quiz-exam-${certification.id}-${seed}`,
    title: `${certification.title} practice exam`,
    description: `${picked.length} randomly generated questions drawn from ${pool.length} in the ${certification.title} bank.`,
    topicIds: [...new Set(picked.map((question) => question.topicId))],
    questionIds: picked.map((question) => question.id),
    kind: "general",
  };
  return { quiz, questions: picked };
}

/** Randomised assignment selection for a certification. */
export function generateAssignments(
  certificationId: string,
  seed: number,
  count = 4,
): Assignment[] {
  const topicIds = new Set(certificationTopics(certificationId).map((topic) => topic.id));
  const pool = assignments.filter((assignment) => topicIds.has(assignment.topicId));
  const source = pool.length > 0 ? pool : assignments;
  return shuffleWithSeed(source, seed).slice(0, Math.min(count, source.length));
}

export function certificationsByLevel() {
  return certificationLevelOrder
    .map((level) => ({
      level,
      label: certificationLevelLabels[level],
      items: certifications.filter((certification) => (certification.level ?? "core") === level),
    }))
    .filter((group) => group.items.length > 0);
}
