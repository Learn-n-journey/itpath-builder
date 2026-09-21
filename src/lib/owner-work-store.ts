/**
 * Live owner recall workbooks from the database, with the build-time snapshot
 * as a fallback.
 *
 * A topic with a recall workbook uses that work and nothing else: the
 * built-in recall prompts, teach-back brief, application scenario and
 * troubleshooting lists for that topic are retired.
 */
import { ownerTopicWork as snapshot } from "@/data/owner-work";
import type { RealWorldScenario, RecallQuestion } from "@/lib/app-data/types";
import type { OwnerTopicWork, OwnerTroubleshooting } from "@/lib/owner-work-shared";

let live: Record<string, OwnerTopicWork> | null = null;
let version = 0;
let loading: Promise<boolean> | null = null;

function workMap(): Record<string, OwnerTopicWork> {
  if (!live) return snapshot;
  return { ...snapshot, ...live };
}

function workFor(topicId: string): OwnerTopicWork | undefined {
  return workMap()[topicId];
}

/** Recall prompts the owner wrote for this topic. */
export function ownerWorkRecallFor(topicId: string): RecallQuestion[] {
  return workFor(topicId)?.recall ?? [];
}

/** The teach-back brief the owner wrote, when the workbook has one. */
export function ownerWorkTeachBackFor(
  topicId: string,
): { prompt: string; expectedPoints: string[] } | undefined {
  return workFor(topicId)?.teachBack;
}

/** The application scenario the owner wrote, when the workbook has one. */
export function ownerWorkScenarioFor(topicId: string): RealWorldScenario | undefined {
  return workFor(topicId)?.scenario;
}

/** The troubleshooting lists the owner wrote, when the workbook has them. */
export function ownerTroubleshootingFor(topicId: string): OwnerTroubleshooting | undefined {
  return workFor(topicId)?.troubleshooting;
}

/** Bumped each time a live load lands, so cached reads can be invalidated. */
export function ownerWorkVersion(): number {
  return version;
}

/** Pulls approved owner work from the database. Safe to call repeatedly. */
export function loadOwnerWork(): Promise<boolean> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase
        .from("owner_topic_work")
        .select("topic_id, work")
        .eq("status", "approved")
        .order("synced_at", { ascending: true })
        .limit(5000);
      if (error) return false;
      const next: Record<string, OwnerTopicWork> = {};
      for (const row of data ?? []) {
        const work = row.work as unknown as OwnerTopicWork | null;
        if (!work) continue;
        next[row.topic_id as string] = { recall: work.recall ?? [], ...work };
      }
      live = next;
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
