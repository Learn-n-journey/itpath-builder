/**
 * The active subject, expressed in the shapes the data layer already speaks.
 *
 * The authored IT material lives in `src/data`. A generated subject arrives as
 * a domain package instead. This file is the one adapter between the two: when
 * the active registry entry carries a package, every data module below reads
 * its content from here rather than from the authored arrays.
 *
 * When the active subject is the authored one this returns `null`, so IT keeps
 * running on exactly the arrays it always did — no behaviour change at all.
 */
import { activeEntry } from "@/domain/registry";
import type { DomainPackage } from "@/domain/package";
import type {
  Certification,
  CertificationObjective,
  LearningModule,
  Lesson,
  PracticeActivity,
  RecallQuestion,
  Topic,
} from "@/lib/app-data/types";

/** How big a paper is in this subject. The authored default is 20 and 50. */
export interface AssessmentSizes {
  sectionQuiz: number;
  stageExam: number;
}

export interface DomainOverlay {
  packageKey: string;
  topics: Topic[];
  lessons: Lesson[];
  certifications: Certification[];
  certificationObjectives: CertificationObjective[];
  modules: LearningModule[];
  recall: RecallQuestion[];
  practice: PracticeActivity[];
  sizes: AssessmentSizes;
  /** Stage papers declared by the package, in learning order. */
  stages: Array<{ id: string; title: string; description: string; from: number; to: number }>;
}

const SECTIONS_PER_MONTH = 4;

function topicIdOf(slug: string): string {
  return `topic-${slug}`;
}

function build(pkg: DomainPackage): DomainOverlay {
  const bySection = new Map(pkg.sections.map((section) => [section.id, section]));
  const slugOf = (sectionId: string) => bySection.get(sectionId)?.slug ?? sectionId;

  const topics: Topic[] = pkg.sections.map((section, index) => {
    const month = Math.floor(index / SECTIONS_PER_MONTH) + 1;
    return {
      id: topicIdOf(section.slug),
      trackId: `track-${pkg.definition.id}`,
      title: section.title,
      summary: section.summary,
      certificationId: section.qualificationId,
      year: month <= 12 ? 1 : 2,
      month,
      week: (index % SECTIONS_PER_MONTH) + 1,
      difficulty: "standard",
      prerequisiteTopicIds: pkg.prerequisites
        .filter((link) => link.sectionId === section.id)
        .map((link) => topicIdOf(slugOf(link.requiresSectionId))),
      learningObjectives: pkg.skills
        .filter((skill) => skill.sectionId === section.id)
        .map((skill) => skill.statement),
      estimatedMinutes: 45,
    };
  });

  const lessons: Lesson[] = pkg.lessons.map((lesson) => {
    const slug = slugOf(lesson.sectionId);
    return {
      id: `lesson-${slug}`,
      topicId: topicIdOf(slug),
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
      nextSteps: [],
    };
  });

  const certifications: Certification[] = pkg.qualifications.map((qualification) => {
    const months = topics
      .filter((topic) => topic.certificationId === qualification.id)
      .map((topic) => topic.month);
    return {
      id: qualification.id,
      title: qualification.title,
      provider: pkg.definition.awardingBody || pkg.definition.appName,
      description: qualification.summary,
      months: [...new Set(months)].sort((a, b) => a - b),
      objectiveIds: qualification.objectives.map((objective) => objective.id),
    };
  });

  const certificationObjectives: CertificationObjective[] = pkg.qualifications.flatMap((qualification) =>
    qualification.objectives.map((objective, index) => ({
      id: objective.id,
      certificationId: qualification.id,
      code: `${index + 1}.0`,
      domain: objective.domain,
      title: objective.text,
      topicIds: pkg.sections
        .filter((section) => section.qualificationId === qualification.id && section.objectiveIds.includes(objective.id))
        .map((section) => topicIdOf(section.slug)),
    })),
  );

  const modules: LearningModule[] = pkg.sections.map((section) => ({
    id: `module-${section.slug}`,
    lessonId: `lesson-${section.slug}`,
    topicId: topicIdOf(section.slug),
    howItWorks: (pkg.lessons.find((lesson) => lesson.sectionId === section.id)?.body ?? "")
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 30)
      .slice(0, 4),
    whereYouSeeIt: [],
    commonProblems: [],
    howItFails: [],
    troubleshooting: [],
    practicalKnowledge: pkg.skills.filter((skill) => skill.sectionId === section.id).map((skill) => skill.statement),
    examCoverage: section.objectiveIds,
    interviewQuestions: [],
    recallQuestionIds: [],
    practiceActivityId: `practice-${section.slug}`,
    scenarioId: "",
  }));

  const recall: RecallQuestion[] = pkg.questions
    .filter((question) => question.kind === "recall")
    .map((question) => ({
      id: question.id,
      topicId: topicIdOf(slugOf(question.sectionId)),
      prompt: question.prompt,
      acceptedConcepts: question.choices,
      explanation: question.explanation,
    }));

  const practice: PracticeActivity[] = pkg.questions
    .filter((question) => question.kind === "practice")
    .map((question) => ({
      id: question.id,
      topicId: topicIdOf(slugOf(question.sectionId)),
      title: "Practice",
      prompt: question.prompt,
      choices: question.choices,
      answerIndex: question.answerIndex,
      explanation: question.explanation,
    }));

  const months = topics.map((topic) => topic.month);
  const stages = pkg.assessments.map((assessment, index) => {
    const covered = topics.filter((topic) => assessment.coversQualificationIds.includes(topic.certificationId));
    return {
      id: assessment.id,
      title: assessment.title,
      description: `${assessment.questionCount} questions drawn from the material this paper covers.`,
      from: covered.length ? Math.min(...covered.map((topic) => topic.month)) : index + 1,
      to: covered.length ? Math.max(...covered.map((topic) => topic.month)) : Math.max(1, ...months),
    };
  });

  return {
    packageKey: pkg.manifest.key,
    topics,
    lessons,
    certifications,
    certificationObjectives,
    modules,
    recall,
    practice,
    sizes: {
      sectionQuiz: pkg.assessmentSizes?.sectionQuiz ?? 20,
      stageExam: pkg.assessmentSizes?.stageExam ?? Math.max(10, pkg.assessments[0]?.questionCount ?? 50),
    },
    stages,
  };
}

/** The active subject's content, or null when the authored subject is live. */
export const domainOverlay: DomainOverlay | null = (() => {
  const pkg = activeEntry().packageSync;
  return pkg ? build(pkg) : null;
})();
