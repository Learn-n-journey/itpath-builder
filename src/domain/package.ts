/**
 * A domain package: one subject, complete and self-contained.
 *
 * A package is everything the engine needs to teach a subject and everything
 * QA needs to judge it: the manifest, the definition, qualifications and their
 * objectives, concepts, skills, prerequisites, lessons, questions, assessment
 * blueprints, outside sources and the extra validation rules that subject is
 * held to. Packages are versioned and isolated, so two versions of the same
 * subject can sit side by side and activation can be reversed.
 *
 * This file has no imports beyond the definition types so the browser, the
 * server and the authoring scripts can all read it.
 */
import type { DomainDefinition } from "./types";
import type { Severity } from "@/lib/quality/rules";

/** Where a package sits in the loop: written, checked, live, or withdrawn. */
export type PackageStatus = "draft" | "approved" | "active" | "retired";

/** Identity and history of one package version. */
export interface DomainManifest {
  /** Stable subject id, lowercase and hyphenated, e.g. "auto-repair". */
  id: string;
  /** Semantic version of this package, e.g. "1.0.0". Never reused. */
  version: string;
  /** `id@version`: the key the registry and the activation log use. */
  key: string;
  /** Human name of the subject. */
  name: string;
  /** Who or what produced it: "authored" or "domain-pipeline". */
  producedBy: string;
  /** ISO timestamp the package was written. */
  producedAt: string;
  status: PackageStatus;
  /** Counts, so a package can be compared with its predecessor at a glance. */
  scope: {
    qualifications: number;
    sections: number;
    concepts: number;
    skills: number;
    questions: number;
    assessments: number;
    sources: number;
  };
  /** Blocking and warning counts from the last independent audit. */
  audit?: { blocking: number; warnings: number; at: string };
}

/** One idea a learner has to hold, with a stable id inside the package. */
export interface DomainConcept {
  /** `<domainId>:concept:<slug>` */
  id: string;
  sectionId: string;
  term: string;
  meaning: string;
}

/** One thing a learner has to be able to do. */
export interface DomainSkill {
  /** `<domainId>:skill:<slug>` */
  id: string;
  sectionId: string;
  statement: string;
}

/** What has to be learned before what. */
export interface DomainPrerequisite {
  sectionId: string;
  requiresSectionId: string;
}

/** A question inside a package, independent of the engine's runtime shape. */
export interface DomainQuestion {
  /** `<domainId>:question:<slug>` */
  id: string;
  sectionId: string;
  kind: "recall" | "practice" | "exam";
  prompt: string;
  choices: string[];
  /** Index into `choices`. Exactly one correct answer. */
  answerIndex: number;
  explanation: string;
}

/** How a qualification is proved. */
export interface DomainAssessment {
  /** `<domainId>:assessment:<slug>` */
  id: string;
  /** The qualifications this paper proves. A stage paper can span several. */
  coversQualificationIds: string[];
  title: string;
  questionCount: number;
  passPercent: number;
  /** Objective ids this paper has to cover. */
  objectiveIds: string[];
}

/** Outside material, checked nightly by the link crawler. */
export interface DomainSource {
  sectionId: string;
  label: string;
  url: string;
  kind: "video" | "reading";
}

/** A standard this subject is held to on top of the shared rule book. */
export interface DomainRule {
  id: string;
  severity: Severity;
  says: string;
}

/** One qualification track and the objectives it is measured against. */
export interface DomainQualification {
  id: string;
  title: string;
  summary: string;
  objectives: Array<{ id: string; domain: string; text: string }>;
}

/** A lesson as stored in a package. */
export interface DomainLesson {
  sectionId: string;
  title: string;
  body: string;
  definition: string;
  whyItMatters: string;
  summary: string;
}

/** One unit of study. */
export interface DomainSection {
  /** `<domainId>:section:<slug>` */
  id: string;
  slug: string;
  title: string;
  summary: string;
  qualificationId: string;
  order: number;
  objectiveIds: string[];
}

/** The whole subject, versioned and self-contained. */
export interface DomainPackage {
  manifest: DomainManifest;
  definition: DomainDefinition;
  qualifications: DomainQualification[];
  sections: DomainSection[];
  lessons: DomainLesson[];
  concepts: DomainConcept[];
  skills: DomainSkill[];
  prerequisites: DomainPrerequisite[];
  questions: DomainQuestion[];
  assessments: DomainAssessment[];
  sources: DomainSource[];
  /** Extra standards this subject is judged by, beyond the shared rule book. */
  rules: DomainRule[];
}

/** The key a package is known by everywhere: registry, ledger, activation log. */
export function packageKey(id: string, version: string): string {
  return `${id}@${version}`;
}

/** Turn any label into a stable, readable id fragment. */
export function idSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Stable id for anything inside a package. */
export function domainId(domainIdValue: string, kind: string, ...parts: string[]): string {
  return [domainIdValue, kind, parts.map(idSlug).join("-")].join(":");
}

/** Recount a package so the manifest can never drift from its contents. */
export function measure(pkg: Omit<DomainPackage, "manifest"> & { manifest: DomainManifest }): DomainManifest["scope"] {
  return {
    qualifications: pkg.qualifications.length,
    sections: pkg.sections.length,
    concepts: pkg.concepts.length,
    skills: pkg.skills.length,
    questions: pkg.questions.length,
    assessments: pkg.assessments.length,
    sources: pkg.sources.length,
  };
}
