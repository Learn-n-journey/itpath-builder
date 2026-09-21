/**
 * Live owner questions from the database, with the build-time spreadsheet
 * snapshot as a fallback.
 *
 * Loaded once after sign-in. Topic pools and the question bank read this
 * synchronously; when a load completes the pool version changes and stale
 * cached pools are rebuilt, so new spreadsheet questions appear without a
 * page reload.
 */
import { ownerQuestions as snapshot } from "@/data/owner-questions";
import type { Question } from "@/lib/app-data/types";

let live: Record<string, Question[]> | null = null;
let version = 0;
let loading: Promise<boolean> | null = null;

/**
 * Live owner questions when loaded, otherwise the build-time snapshot.
 *
 * A topic the snapshot covers never falls back to generated questions just
 * because the live load returned nothing for it: the snapshot rows stand in
 * until a live load actually brings questions for that topic.
 */
export function ownerQuestionMap(): Record<string, Question[]> {
  if (!live) return snapshot;
  const merged: Record<string, Question[]> = { ...live };
  for (const [topicId, list] of Object.entries(snapshot)) {
    if (!merged[topicId]?.length && list.length) merged[topicId] = list;
  }
  return merged;
}

/** The owner questions for one topic, when that topic has any. */
export function ownerQuestionsFor(topicId: string): Question[] | undefined {
  const list = ownerQuestionMap()[topicId];
  return list && list.length ? list : undefined;
}

/** Topics that have owner questions; their generated questions are retired. */
export function ownerTopicIds(): Set<string> {
  return new Set(
    Object.entries(ownerQuestionMap())
      .filter(([, list]) => list.length > 0)
      .map(([topicId]) => topicId),
  );
}

/** Bumped each time a live load lands, so cached pools can be invalidated. */
export function ownerPoolVersion(): number {
  return version;
}

const listeners = new Set<() => void>();

/** Notified when a live load lands, so open pages can refresh their content. */
export function subscribeOwnerQuestions(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener) as unknown as void;
}

/** Pulls approved owner questions from the database. Safe to call repeatedly. */
export function loadOwnerQuestions(): Promise<boolean> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("owner_questions")
        .select("topic_id, question")
        .eq("status", "approved")
        .order("synced_at", { ascending: true })
        .limit(20000);
      if (error) return false;
      const next: Record<string, Question[]> = {};
      for (const row of data ?? []) {
        const topicId = row.topic_id as string;
        (next[topicId] ??= []).push(row.question as unknown as Question);
      }
      live = next;
      version += 1;
      listeners.forEach((listener) => listener());
      return true;
    } catch {
      return false;
    } finally {
      loading = null;
    }
  })();
  return loading;
}
