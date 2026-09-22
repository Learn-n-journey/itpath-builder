// ============= Full file contents =============
/**
 * Owner-only sync controls for the spreadsheet content sync.
 *
 * Pressing "Sync now" only writes a request; the server picks it up and does
 * the work on its own, so closing the app or locking the screen cannot
 * interrupt a run. The Settings panel reads the status back from the queue.
 */
import { createServerFn } from "@tanstack/react-start";

import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface SyncRunSummary {
  skipped?: string | null;
  topics: number;
  approved: number;
  rejected: number;
  lessonsApproved: number;
  lessonsRejected: number;
  workTopics: number;
  unchangedFiles?: number;
  lessonIssues: Array<{ file: string; topic: string; reasons: string[] }>;
}

/** Live counters written while a run is still going. */
export interface SyncProgressStatus {
  stage: string;
  course: string;
  file?: string;
  filesDone: number;
  topics: number;
  approved: number;
  lessonsApproved: number;
  unchangedFiles: number;
  at: string;
}

export interface SyncRunStatus {
  id: string;
  scope: string;
  status: "queued" | "running" | "done" | "failed";
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  result?: SyncRunSummary | null;
  progress?: SyncProgressStatus | null;
}

function isOwner(context: { claims: unknown }): boolean {
  const email = (context.claims as { email?: string } | null)?.email;
  return OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
}

/** A built-in course, a created path's own id, or "all". */
type SyncScope = "it-cybersecurity" | "auto-repair" | "all" | (string & {});

/** Puts a sync in the queue. Returns as soon as it is written. */
export const syncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope?: SyncScope; force?: boolean } | undefined) => ({
    scope: (input?.scope ?? "all") as SyncScope,
    force: input?.force === true,
  }))
  .handler(async ({ context, data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    if (!isOwner(context)) return { ok: false, error: "Not allowed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const waiting = await supabaseAdmin
      .from("sync_queue")
      .select("id")
      .in("status", ["queued", "running"])
      .limit(1);
    if (waiting.data?.length) {
      return { ok: true, id: waiting.data[0]!.id };
    }

    const { data: row, error } = await supabaseAdmin
      .from("sync_queue")
      .insert({ scope: data.scope, force: data.force, requested_by: context.userId })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    // Arms the server-side runner. It checks every minute while something is
    // waiting and switches itself off once the queue is empty, so the run
    // finishes even with the app closed.
    await supabaseAdmin.rpc("ensure_sync_worker");

    return { ok: true, id: row.id };
  });

/** The latest few runs, newest first, for the Settings panel. */
export const syncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; runs: SyncRunStatus[]; error?: string }> => {
    if (!isOwner(context)) return { ok: false, runs: [], error: "Not allowed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("sync_queue")
      .select("id, scope, status, error, result, created_at, started_at, finished_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) return { ok: false, runs: [], error: error.message };

    return {
      ok: true,
      runs: (data ?? []).map((row) => ({
        id: row.id,
        scope: row.scope,
        status: row.status as SyncRunStatus["status"],
        error: row.error,
        createdAt: row.created_at,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        result: ((row.result as { progress?: unknown; tally?: unknown } | null)?.progress ||
        (row.result as { tally?: unknown } | null)?.tally
          ? null
          : ((row.result as unknown as SyncRunSummary | null) ?? null)),
        progress:
          ((row.result as { progress?: SyncProgressStatus } | null)?.progress as
            | SyncProgressStatus
            | undefined) ?? null,
      })),
    };
  });

/** Clears a stuck sync so a new one can start. Owner only. */
export const clearSyncLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; error?: string }> => {
    if (!isOwner(context)) return { ok: false, error: "Not allowed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("sync_queue")
      .update({
        status: "failed",
        error: "Cleared by the owner.",
        finished_at: new Date().toISOString(),
      })
      .in("status", ["queued", "running"]);

    const { releaseSyncLock } = await import("@/lib/sheet-sync.server");
    const result = await releaseSyncLock();
    return result.ok ? { ok: true } : { ok: false, error: result.error ?? "Could not clear it." };
  });
