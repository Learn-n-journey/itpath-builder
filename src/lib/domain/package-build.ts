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
  DomainPackage,
  DomainPrerequisite,
  DomainQuestion,
  DomainSection,
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
    return [practice, ...recall];
  });

  const assessments: DomainAssessment[] = draft.qualifications.map((qualification) => ({
    id: domainId(D, "assessment", qualification.id),
    qualificationId: qualification.id,
    title: `${qualification.title} exam`,
    questionCount: Math.min(
      50,
      Math.max(10, draft.seeds.filter((seed) => seed.cert === qualification.id).length * 2),
    ),
    passPercent: 80,
    objectiveIds: qualification.objectives.map((objective) => objective.id),
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
    rules: [],
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
