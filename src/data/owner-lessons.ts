/**
 * Build-time snapshot of the owner's spreadsheet lessons.
 *
 * The live copy is pulled from the database at runtime; this file is the
 * offline fallback, so a lesson never vanishes because a load failed. It is
 * rewritten by the sync tooling and is empty until the first export.
 */
import type { DeepLesson } from "@/data/deep-lessons/types";
import type { PracticeActivity, Resource } from "@/lib/app-data/types";

export const ownerLessons: Record<string, DeepLesson> = {};

export const ownerLessonSources: Record<string, Resource[]> = {};

export const ownerLessonPractice: Record<string, PracticeActivity[]> = {};
