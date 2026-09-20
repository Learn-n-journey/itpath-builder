/**
 * Turns a generated domain package into a course pack.
 *
 * Authored subjects (IT) ship a hand-written pack. Subjects produced by the
 * domain pipeline ship a package instead: the same material, stored in the
 * package shapes. This adapter maps one onto the other so a generated subject
 * can be activated by key and the engine reads it exactly like any other pack.
 *
 * Nothing here is subject specific. It only translates shapes.
 */
import type {
  Certification,
  CertificationObjective,
  Lesson,
  PracticeActivity,
  Question,
  RecallQuestion,
  Topic,
} from "@/lib/app-data/types";
import type { DomainPackage, DomainQuestion } from "@/domain/package";
import type { CoursePack } from "@/content/pack-contract";
import type { StageExam } from "@/data/stage-exams";
import { ownerLessonFor } from "@/lib/owner-lesson-store";

/** A stable, repeatable shuffle, so the same draw always yields the same paper. */
function seeded(seed: string): () => number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap] as T, copy[index] as T];
  }
  return copy;
}

function toQuestion(question: DomainQuestion, certificationId: string, quizId: string): Question {
  const answer = question.choices[question.answerIndex] ?? question.choices[0] ?? "";
  return {
    id: question.id,
    topicId: question.sectionId,
    quizId,
    certificationId,
    type: "multiple_choice",
    prompt: question.prompt,
    choices: question.choices,
    correctAnswer: [answer],
    acceptableAnswers: [answer],
    explanation: question.explanation,
    difficulty: "standard",
    mistakeCategory: "concept",
    requiresReasoning: false,
  };
}

/** Builds a course pack from a self-contained domain package. */
export function coursePackFromDomainPackage(pkg: DomainPackage): CoursePack {
  const sizes = pkg.assessmentSizes ?? { sectionQuiz: 10, stageExam: 10 };
  const orderedSections = [...pkg.sections].sort((left, right) => left.order - right.order);

  const sections: Topic[] = orderedSections.map((section, index) => ({
    id: section.id,
    trackId: pkg.manifest.id,
    title: section.title,
    summary: section.summary,
    certificationId: section.qualificationId,
    year: 1,
    month: index + 1,
    week: 1,
    difficulty: "standard",
    prerequisiteTopicIds: pkg.prerequisites
      .filter((edge) => edge.sectionId === section.id)
      .map((edge) => edge.requiresSectionId),
    learningObjectives: section.objectiveIds,
    estimatedMinutes: 30,
  }));

  const lessons: Lesson[] = pkg.lessons.map((lesson) => ({
    id: `lesson-${lesson.sectionId}`,
    topicId: lesson.sectionId,
    title: lesson.title,
    body: lesson.body,
    definition: lesson.definition,
    whyItMatters: lesson.whyItMatters,
    keyTerms: pkg.concepts
      .filter((concept) => concept.sectionId === lesson.sectionId)
      .map((concept) => ({ term: concept.term, meaning: concept.meaning })),
    realWorldExamples: [],
    commonMisconceptions: [],
    summary: lesson.summary,
    nextSteps: pkg.skills
      .filter((skill) => skill.sectionId === lesson.sectionId)
      .map((skill) => skill.statement),
  }));

  const qualifications: Certification[] = pkg.qualifications.map((qualification) => ({
    id: qualification.id,
    title: qualification.title,
    provider: pkg.definition.appName,
    description: qualification.summary,
    objectiveIds: qualification.objectives.map((objective) => objective.id),
  }));

  const objectives: CertificationObjective[] = pkg.qualifications.flatMap((qualification) =>
    qualification.objectives.map((objective) => ({
      id: objective.id,
      certificationId: qualification.id,
      code: objective.id,
      domain: objective.domain,
      title: objective.text,
      topicIds: orderedSections.filter((section) => section.objectiveIds.includes(objective.id)).map((section) => section.id),
    })),
  );

  const certificationOf = (sectionId: string): string =>
    orderedSections.find((section) => section.id === sectionId)?.qualificationId ?? "";

  const poolFor = (topicId: string): Question[] =>
    pkg.questions
      .filter((question) => question.sectionId === topicId && question.kind !== "recall")
      .map((question) => toQuestion(question, certificationOf(topicId), `section-quiz-${topicId}`));

  const drawFor = (topicId: string, nonce: number): Question[] => {
    const pool = poolFor(topicId);
    if (pool.length === 0) return [];
    return shuffled(pool, seeded(`${topicId}:${nonce}`)).slice(0, sizes.sectionQuiz);
  };

  const recall: RecallQuestion[] = pkg.questions
    .filter((question) => question.kind === "recall")
    .map((question) => ({
      id: question.id,
      topicId: question.sectionId,
      prompt: question.prompt,
      acceptedConcepts: [question.choices[question.answerIndex] ?? ""].filter(Boolean),
      explanation: question.explanation,
    }));

  const practice: PracticeActivity[] = pkg.questions
    .filter((question) => question.kind === "practice")
    .map((question) => ({
      id: question.id,
      topicId: question.sectionId,
      title: question.prompt.slice(0, 60),
      prompt: question.prompt,
      choices: question.choices,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    }));

  const stageExams: StageExam[] = pkg.assessments.map((assessment, index) => {
    const qualificationIds = new Set(assessment.coversQualificationIds);
    const sectionIds = orderedSections
      .filter((section) => qualificationIds.has(section.qualificationId))
      .map((section) => section.id);
    const questions = sectionIds.flatMap((sectionId) => poolFor(sectionId));
    return {
      id: assessment.id,
      stage: `Stage ${index + 1}`,
      title: assessment.title,
      description: `${assessment.questionCount} questions, ${assessment.passPercent}% to pass.`,
      from: index + 1,
      to: index + 1,
      questions,
    };
  });

  const stageExamQuestions = (examId: string, nonce = 0): Question[] => {
    const exam = stageExams.find((item) => item.id === examId);
    if (!exam || exam.questions.length === 0) return [];
    return shuffled(exam.questions, seeded(`${examId}:${nonce}`)).slice(0, sizes.stageExam);
  };

  const lessonText = (topicId: string): string => {
    const lesson = lessons.find((item) => item.topicId === topicId);
    if (!lesson) return "";
    return [
      lesson.body,
      lesson.definition,
      lesson.whyItMatters,
      lesson.summary,
      ...lesson.keyTerms.map((term) => `${term.term}: ${term.meaning}`),
      ...lesson.nextSteps,
    ]
      .filter(Boolean)
      .join("\n");
  };

  return {
    domain: pkg.definition,
    subject: {
      field: pkg.definition.field,
      qualificationWord: pkg.definition.vocabulary.qualification,
      sectionWord: pkg.definition.vocabulary.section ?? "section",
      sourceNote: `Built from the ${pkg.manifest.name} package ${pkg.manifest.version}.`,
    },

    qualifications,
    objectives,

    sections,
    lessons,
    deepLessons: [],
    getDeepLesson: (topicId: string) => ownerLessonFor(topicId),
    phases: pkg.qualifications.map((qualification, index) => ({
      title: qualification.title,
      stage: `Stage ${index + 1}`,
      blurb: qualification.summary,
      topics: orderedSections
        .filter((section) => section.qualificationId === qualification.id)
        .map((section) => ({
          id: section.id,
          title: section.title,
          summary: section.summary,
          minutes: 30,
        })),
    })),
    prerequisites: orderedSections.map((section) => ({
      id: `skill-${section.id}`,
      title: section.title,
      topicId: section.id,
      prerequisiteSkillIds: pkg.prerequisites
        .filter((edge) => edge.sectionId === section.id)
        .map((edge) => `skill-${edge.requiresSectionId}`),
      summary: section.summary,
    })),

    modules: [],
    recall,
    practice,
    scenarios: [],
    workedExamples: [],
    getRecallQuestions: (topicId) => recall.filter((item) => item.topicId === topicId),
    getPracticeActivities: (topicId) => practice.filter((item) => item.topicId === topicId),
    getRealWorldScenario: () => undefined,

    sectionQuiz: (topicId, attempt = 0) => drawFor(topicId, attempt),
    sectionQuestionPool: poolFor,
    sectionQuizDraw: drawFor,
    lessonText,
    conceptId: (question) => `${question.topicId}:${question.id}`,
    assessmentSizes: sizes,
    stageExams,
    stageExamQuestions,
    masteryCheckPool: () => [],
    masteryCheckSet: () => undefined,
    hasMasteryCheck: () => false,

    labs: [],
    incidents: [],
    tickets: [],
    assignments: [],
    identification: {
      parts: [],
      buildLabs: () => [],
      set: () => undefined,
      isIdentificationLab: () => false,
    },

    resources: {
      videos: Object.fromEntries(
        orderedSections.map((section) => [
          section.id,
          pkg.sources
            .filter((source) => source.sectionId === section.id && source.kind === "video")
            .map((source) => ({
              title: source.label,
              url: source.url,
              exam: section.qualificationId,
              objective: section.objectiveIds[0] ?? "",
              description: source.label,
            })),
        ]),
      ),
      reading: Object.fromEntries(
        pkg.sources
          .filter((source) => source.kind === "reading")
          .map((source) => [
            source.sectionId,
            { key: source.sectionId, title: source.label, provider: pkg.manifest.name, url: source.url },
          ]),
      ),
    },
  };
}
