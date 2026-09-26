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
import { activeEntry, findEntry } from "@/domain/registry";
import { activeDomainKey } from "@/lib/active-domain";
import type { DomainPackage } from "@/domain/package";
import type {
  Certification,
  CertificationObjective,
  LearningModule,
  Lesson,
  PracticeActivity,
  RealWorldScenario,
  RecallQuestion,
  Resource,
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
  /** Reading and watching material, one entry per source the subject declares. */
  resources: Resource[];
  /** Judgement calls from real work, when the subject wrote them. */
  scenarios: RealWorldScenario[];
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
      realWorldExamples: lesson.realWorldExamples ?? [],
      commonMisconceptions: lesson.commonMisconceptions ?? [],
      summary: lesson.summary,
      nextSteps: lesson.nextSteps ?? [],
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

  const detailOf = new Map((pkg.moduleDetails ?? []).map((detail) => [detail.sectionId, detail]));
  const scenarioOf = new Map((pkg.scenarios ?? []).map((scenario) => [scenario.sectionId, scenario]));

  const modules: LearningModule[] = pkg.sections.map((section) => {
    const lesson = pkg.lessons.find((item) => item.sectionId === section.id);
    const detail = detailOf.get(section.id);
    const sectionSkills = pkg.skills.filter((skill) => skill.sectionId === section.id).map((skill) => skill.statement);
    const sectionConcepts = pkg.concepts.filter((concept) => concept.sectionId === section.id);
    const bodySentences = (lesson?.body ?? "")
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 30);
    const diagnosticSkills = sectionSkills.filter((skill) => /diagnos|inspect|test|measure|verify|determin|evaluat|check/i.test(skill));
    const repairSkills = sectionSkills.filter((skill) => /repair|replace|service|install|adjust|recondition|correct|perform/i.test(skill));
    const fallbackProblems = [
      ...(lesson?.commonMisconceptions ?? []),
      ...sectionConcepts.slice(0, 3).map((concept) => `A fault involving ${concept.term.toLowerCase()}`),
    ].slice(0, 3);
    const fallbackTroubleshooting = [
      `Verify the complaint and operating conditions before changing parts in ${section.title.toLowerCase()}.`,
      ...(diagnosticSkills.length ? diagnosticSkills : sectionSkills).slice(0, 3),
      `Compare the result with the correct service information and isolate the failed condition before repair.`,
      `After the repair, repeat the original test and verify the complaint is gone.`,
    ];
    return {
      id: `module-${section.slug}`,
      lessonId: `lesson-${section.slug}`,
      topicId: topicIdOf(section.slug),
      howItWorks: bodySentences.slice(0, 4),
      whereYouSeeIt: detail?.whereYouSeeIt?.length ? detail.whereYouSeeIt : [lesson?.whyItMatters ?? section.summary],
      commonProblems: detail?.commonProblems?.length ? detail.commonProblems : fallbackProblems,
      howItFails: detail?.howItFails?.length ? detail.howItFails : [lesson?.summary ?? section.summary],
      troubleshooting: detail?.troubleshooting?.length ? detail.troubleshooting : fallbackTroubleshooting,
      practicalKnowledge: repairSkills.length ? repairSkills : sectionSkills,
      examCoverage: section.objectiveIds,
      interviewQuestions: detail?.interviewQuestions ?? [],
      recallQuestionIds: [],
      practiceActivityId: `practice-${section.slug}`,
      scenarioId: scenarioOf.get(section.id)?.id ?? "",
    };
  });

  const scenarios: RealWorldScenario[] = (pkg.scenarios ?? []).map((scenario) => ({
    id: scenario.id,
    topicId: topicIdOf(slugOf(scenario.sectionId)),
    title: scenario.title,
    situation: scenario.situation,
    decisionPrompt: scenario.decisionPrompt,
    expectedConcepts: scenario.expectedConcepts,
    guidance: scenario.guidance,
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

  const resources: Resource[] = pkg.sources.map((source, index) => {
    const slug = slugOf(source.sectionId);
    const topicId = topicIdOf(slug);
    return {
      id: `resource-${pkg.definition.id}-${index + 1}`,
      title: source.label,
      provider: new URL(source.url).hostname.replace(/^www\./, ""),
      url: source.url,
      topicIds: [topicId],
      certificationId: bySection.get(source.sectionId)?.qualificationId ?? "",
      kind: source.kind === "video" ? "video" : "docs",
      difficulty: "standard",
      access: "free",
      lastVerified: pkg.manifest.producedAt.slice(0, 10),
      status: "verified",
    };
  });

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
    resources,
    scenarios,
    sizes: {
      sectionQuiz: pkg.assessmentSizes?.sectionQuiz ?? 20,
      stageExam: pkg.assessmentSizes?.stageExam ?? Math.max(10, pkg.assessments[0]?.questionCount ?? 50),
    },
    stages,
  };
}

/**
 * The active subject's content, or null when the authored subject is live.
 * A subject chosen in settings on this device wins over the build default, so
 * the curriculum on screen always matches the subject the app says it is in.
 */
export const domainOverlay: DomainOverlay | null = (() => {
  const entry = findEntry(activeDomainKey()) ?? activeEntry();
  const pkg = entry.packageSync;
  return pkg ? build(pkg) : null;
})();

