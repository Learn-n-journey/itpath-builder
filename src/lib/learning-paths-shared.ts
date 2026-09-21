/**
 * Learning paths created from Settings.
 *
 * A created path is a fresh subject: the same app architecture (sections,
 * lessons, topic quizzes, a final exam, labs) with none of the games or
 * subject-specific tools of IT PATH or AUTO PATH. Its material comes entirely
 * from the owner's spreadsheets, in a folder named "<name> path" holding the
 * usual lessons / try it / quiz / labs sub-folders.
 *
 * This file has no imports beyond types, so the browser, the server functions
 * and the sync can all read it.
 */
import type { DomainDefinition } from "@/domain/types";

export interface LearningPath {
  /** Lowercase, hyphenated id, e.g. "writing". */
  slug: string;
  /** What the owner typed, e.g. "Writing". */
  name: string;
  /** The OneDrive folder this path reads, always "<name> path". */
  folder: string;
  /** The section titles, in order. Section 1 is workbook 1.xlsx. */
  topics: string[];
  /** False while the path is owner-only. */
  visible: boolean;
}

/** The version every created path runs at; keys stay `slug@1.0.0`. */
export const PATH_VERSION = "1.0.0";

/** Sizes every created path is held to: 20 per topic quiz, 80 in the final. */
export const PATH_SIZES = { sectionQuiz: 20, stageExam: 80 } as const;

export function pathSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** The folder rule: a path named "Writing" always reads "writing path". */
export function pathFolder(name: string): string {
  return `${name.trim().toLowerCase().replace(/\s+/g, " ")} path`;
}

export function pathKey(slug: string): string {
  return `${slug}@${PATH_VERSION}`;
}

/** The product name shown on screen, matching IT PATH and AUTO PATH. */
export function pathAppName(name: string): string {
  return `${name.trim().toUpperCase()} PATH`;
}

export function pathCertificationId(slug: string): string {
  return `${slug}-certificate`;
}

export function pathTopicId(slug: string, number: number): string {
  return `${slug}-section-${number}`;
}

/** A created path has no feeds and no trade vocabulary of its own. */
export function pathDefinition(path: LearningPath): DomainDefinition {
  return {
    id: path.slug,
    appName: pathAppName(path.name),
    field: path.name.trim(),
    summary: `A study path covering ${path.name.trim()}.`,
    sourceNote: "Every lesson, question and lab in this path comes from the course spreadsheets.",
    defaultQualification: `${path.name.trim()} certificate`,
    defaultGoal: `Finish the ${path.name.trim()} path`,
    vocabulary: {
      qualification: "certificate",
      qualifications: "certificates",
      section: "section",
      sections: "sections",
      lab: "exercise",
      ticket: "task",
      exam: "exam",
    },
    feeds: { jobs: false, news: false, videos: false },
  };
}

/** Rows as they come back from the database. */
export function learningPathFromRow(row: {
  slug: string;
  name: string;
  folder: string;
  topics: unknown;
  visible: boolean;
}): LearningPath {
  const topics = Array.isArray(row.topics)
    ? row.topics.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
  return {
    slug: row.slug,
    name: row.name,
    folder: row.folder,
    topics,
    visible: row.visible,
  };
}
