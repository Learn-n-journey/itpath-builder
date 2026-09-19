/**
 * Turns a generated draft into a complete, versioned domain package.
 *
 * Client safe: pure data, no filesystem, no AI. Every item gets a stable id
 * built from the subject id, so a finding raised today still points at the
 * same thing after the next regeneration.
 */
import { domainId, measure, packageKey } from "@/domain/package";
import type {
  DomainAssessment,
  DomainConcept,
  DomainLesson,
  DomainModuleDetail,
  DomainPackage,
  DomainPrerequisite,
  DomainQuestion,
  DomainSection,
  DomainScenario,
  DomainSkill,
  DomainSource,
} from "@/domain/package";
import type { DomainDraft } from "./brief";

export interface BuildOptions {
  version: string;
  producedBy?: string;
  producedAt?: string;
}

export function buildPackageFromDraft(draft: DomainDraft, options: BuildOptions): DomainPackage {
  const D = draft.definition.id;
  const sectionId = (slug: string) => domainId(D, "section", slug);

  const sections: DomainSection[] = draft.seeds.map((seed, index) => ({
    id: sectionId(seed.slug),
    slug: seed.slug,
    title: seed.title,
    summary: seed.summary,
    qualificationId: seed.cert,
    order: index,
    objectiveIds: seed.objectives,
  }));

  const lessons: DomainLesson[] = draft.seeds.map((seed) => ({
    sectionId: sectionId(seed.slug),
    title: seed.lesson.title,
    body: seed.lesson.body,
    definition: seed.lesson.definition,
    whyItMatters: seed.lesson.whyItMatters,
    summary: seed.lesson.summary,
    realWorldExamples: seed.lesson.examples,
    commonMisconceptions: seed.lesson.misconceptions,
    nextSteps: seed.lesson.nextSteps,
  }));

  // The working detail behind each section: the generator writes it, so the
  // package keeps it rather than throwing it away at build time.
  const moduleDetails: DomainModuleDetail[] = draft.seeds.map((seed) => ({
    sectionId: sectionId(seed.slug),
    whereYouSeeIt: seed.module.whereYouSeeIt,
    commonProblems: seed.module.commonProblems,
    howItFails: seed.module.howItFails,
    troubleshooting: seed.module.troubleshooting,
    interviewQuestions: seed.module.interviewQuestions,
  }));

  const scenarios: DomainScenario[] = draft.seeds
    .filter((seed) => seed.scenario.situation && seed.scenario.decisionPrompt)
    .map((seed) => ({
      id: domainId(D, "scenario", seed.slug),
      sectionId: sectionId(seed.slug),
      title: seed.scenario.title || seed.title,
      situation: seed.scenario.situation,
      decisionPrompt: seed.scenario.decisionPrompt,
      expectedConcepts: seed.scenario.expectedConcepts,
      guidance: seed.scenario.guidance,
    }));

  const concepts: DomainConcept[] = draft.seeds.flatMap((seed) =>
    seed.lesson.keyTerms.map(([term, meaning]) => ({
      id: domainId(D, "concept", seed.slug, term),
      sectionId: sectionId(seed.slug),
      term,
      meaning,
    })),
  );

  const skills: DomainSkill[] = draft.seeds.flatMap((seed) =>
    seed.module.practicalKnowledge.map((statement, index) => ({
      id: domainId(D, "skill", seed.slug, String(index)),
      sectionId: sectionId(seed.slug),
      statement,
    })),
  );

  const prerequisites: DomainPrerequisite[] = draft.seeds.flatMap((seed) =>
    seed.prereqs.map((requires) => ({
      sectionId: sectionId(seed.slug),
      requiresSectionId: sectionId(requires),
    })),
  );

  const questions: DomainQuestion[] = draft.seeds.flatMap((seed) => {
    const practice: DomainQuestion = {
      id: domainId(D, "question", seed.slug, "practice"),
      sectionId: sectionId(seed.slug),
      kind: "practice",
      prompt: seed.practice.prompt,
      choices: seed.practice.choices,
      answerIndex: seed.practice.answerIndex,
      explanation: seed.practice.explanation,
    };
    const recall: DomainQuestion[] = seed.recall.map(([prompt, accepted, explanation], index) => ({
      id: domainId(D, "question", seed.slug, `recall-${index}`),
      sectionId: sectionId(seed.slug),
      kind: "recall",
      prompt,
      choices: accepted,
      answerIndex: 0,
      explanation,
    }));
    const bank: DomainQuestion[] = (draft.banks?.[seed.slug] ?? []).map((row, index) => ({
      id: domainId(D, "question", seed.slug, `bank-${index}`),
      sectionId: sectionId(seed.slug),
      kind: "practice",
      prompt: row.prompt,
      choices: row.choices,
      answerIndex: row.answerIndex,
      explanation: row.explanation,
    }));
    return [practice, ...bank, ...recall];
  });

  // Papers are sized by what the subject actually holds, and the size is
  // declared once so QA can hold every paper to it exactly.
  const perQualification = draft.qualifications.map(
    (qualification) => draft.seeds.filter((seed) => seed.cert === qualification.id).length,
  );
  const smallestTrack = perQualification.length ? Math.min(...perQualification) : draft.seeds.length;
  const sectionQuizSize = 10;
  const stageExamSize = Math.max(10, Math.min(50, smallestTrack * 2));

  // A paper only tests what the subject actually teaches, so its objective
  // list is the taught intersection, never the whole published list.
  const taught = new Set(draft.seeds.flatMap((seed) => seed.objectives));
  const assessments: DomainAssessment[] = draft.qualifications.map((qualification) => ({
    id: domainId(D, "assessment", qualification.id),
    coversQualificationIds: [qualification.id],
    title: `${qualification.title} exam`,
    questionCount: stageExamSize,
    passPercent: 80,
    objectiveIds: qualification.objectives.map((objective) => objective.id).filter((id) => taught.has(id)),
  }));


  const sources: DomainSource[] = Object.entries(draft.sources).flatMap(([slug, list]) =>
    list.map((source) => ({
      sectionId: sectionId(slug),
      label: source.label,
      url: source.url,
      kind: source.kind,
    })),
  );

  const base = {
    definition: draft.definition,
    qualifications: draft.qualifications,
    sections,
    lessons,
    concepts,
    skills,
    prerequisites,
    questions,
    assessments,
    sources,
    moduleDetails,
    scenarios,
    rules: [],
    assessmentSizes: { sectionQuiz: sectionQuizSize, stageExam: stageExamSize },
  };

  const manifest = {
    id: D,
    version: options.version,
    key: packageKey(D, options.version),
    name: draft.definition.appName,
    producedBy: options.producedBy ?? "domain-pipeline",
    producedAt: options.producedAt ?? new Date().toISOString(),
    status: "draft" as const,
    scope: measure({ ...base, manifest: {} as never }),
  };

  return { ...base, manifest } satisfies DomainPackage;
}
