/**
 * What a new subject is asked for, and what a generated draft looks like
 * before it is written to disk. Client safe: no AI, no filesystem.
 */
import type { DomainDefinition } from "@/domain/types";
import type { TopicSeed } from "@/data/curriculum/builder";

/** The instruction a person gives when they want a new subject. */
export interface DomainBrief {
  /** Stable id, lowercase and hyphenated, e.g. "auto-repair". */
  id: string;
  /** The field being taught, e.g. "auto repair". */
  field: string;
  /** Who awards the qualifications, e.g. "ASE". Empty when nobody does. */
  awardingBody: string;
  /** Names of the qualification tracks to build, in learning order. */
  qualifications: string[];
  /** How many sections to write per qualification. */
  sectionsPerQualification: number;
  /** Anything else the author wants honoured, in plain words. */
  notes?: string;
  /** How many extra practice questions to write per section. Default: none. */
  questionsPerSection?: number;
}

/** One qualification track in a draft. */
export interface DraftQualification {
  id: string;
  title: string;
  summary: string;
  /** The published areas the qualification is measured against. */
  objectives: Array<{ id: string; domain: string; text: string }>;
}

/** A whole subject, generated but not yet accepted. */
export interface DomainDraft {
  definition: DomainDefinition;
  qualifications: DraftQualification[];
  seeds: TopicSeed[];
  /** Outside material per section slug: training videos and reading. */
  sources: Record<string, Array<{ label: string; url: string; kind: "video" | "reading" }>>;
  /** Extra multiple-choice practice per section slug, beyond the one written with the section. */
  banks?: Record<string, Array<{ prompt: string; choices: string[]; answerIndex: number; explanation: string }>>;
}
