/**
 * Live owner lessons from the database, with the build-time snapshot as a
 * fallback.
 *
 * A topic with an owner lesson shows that lesson and nothing else: the
 * built-in written lesson for that topic is retired wherever lessons are read.
 * A topic the live load has nothing for keeps its snapshot lesson, so a lesson
 * never silently disappears.
 */
import {
  ownerLessons as snapshot,
  ownerLessonPractice as snapshotPractice,
  ownerLessonSources as snapshotSources,
} from "@/data/owner-lessons";
import type { DeepLesson } from "@/data/deep-lessons/types";
import type { PracticeActivity, Resource } from "@/lib/app-data/types";

let liveLessons: Record<string, DeepLesson> | null = null;
let liveSources: Record<string, Resource[]> | null = null;
let livePractice: Record<string, PracticeActivity[]> | null = null;
let version = 0;
let loading: Promise<boolean> | null = null;

function lessonMap(): Record<string, DeepLesson> {
  if (!liveLessons) return snapshot;
  return { ...snapshot, ...liveLessons };
}

function sourceMap(): Record<string, Resource[]> {
  if (!liveSources) return snapshotSources;
  return { ...snapshotSources, ...liveSources };
}

/** The owner-written lesson for a topic, when one has been published. */
export function ownerLessonFor(topicId: string): DeepLesson | undefined {
  return lessonMap()[topicId];
}

/** The links the owner pasted into that topic's Sources tab. */
export function ownerLessonSourcesFor(topicId: string): Resource[] {
  return sourceMap()[topicId] ?? [];
}

/** The practice questions the owner wrote on that topic's Practice tab. */
export function ownerPracticeFor(topicId: string): PracticeActivity[] {
  const map = livePractice ? { ...snapshotPractice, ...livePractice } : snapshotPractice;
  return map[topicId] ?? [];
}

/** Topics whose built-in lesson has been replaced by an owner lesson. */
export function ownerLessonTopicIds(): Set<string> {
  return new Set(Object.keys(lessonMap()));
}

/** Bumped each time a live load lands, so cached reads can be invalidated. */
export function ownerLessonVersion(): number {
  return version;
}

/** Pulls approved owner lessons from the database. Safe to call repeatedly. */
export function loadOwnerLessons(): Promise<boolean> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("owner_lessons")
        .select("topic_id, lesson, sources, practice")
        .eq("status", "approved")
        .order("synced_at", { ascending: true })
        .limit(5000);
      if (error) return false;
      const lessons: Record<string, DeepLesson> = {};
      const sources: Record<string, Resource[]> = {};
      const practice: Record<string, PracticeActivity[]> = {};
      for (const row of data ?? []) {
        const topicId = row.topic_id as string;
        lessons[topicId] = row.lesson as unknown as DeepLesson;
        sources[topicId] = (row.sources as unknown as Resource[]) ?? [];
        const rows = (row.practice as unknown as PracticeActivity[]) ?? [];
        if (rows.length) practice[topicId] = rows;
      }
      liveLessons = lessons;
      liveSources = sources;
      livePractice = practice;
      version += 1;
      return true;
    } catch {
      return false;
    } finally {
      loading = null;
    }
  })();
  return loading;
}
