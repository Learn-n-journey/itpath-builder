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
  lessonIssues: Array<{ file: string; topic: string; domain?: string; topicId?: string; reasons: string[] }>;
  report?: Record<string, string | number | boolean | null | undefined | string[]>[];
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
const UNAVAILABLE = "Syncing is unavailable right now.";

/** The privileged backend client, or null when it cannot be created. */
async function adminClient() {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    void supabaseAdmin.from;
    return supabaseAdmin;
  } catch {
    return null;
  }
}

export const syncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { scope?: SyncScope; force?: boolean } | undefined) => ({
    scope: (input?.scope ?? "all") as SyncScope,
    force: input?.force === true,
  }))
  .handler(async ({ context, data }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    if (!isOwner(context)) return { ok: false, error: "Not allowed." };

    const supabaseAdmin = await adminClient();
    if (!supabaseAdmin) return { ok: false, runs: [], error: UNAVAILABLE } as never;

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

    return { ok: true, id: row.id };
  });

/**
 * Works through one slice of the waiting sync and returns.
 *
 * The app calls this in a loop while it is open, so a run makes steady
 * progress without the minute-by-minute background worker.
 */
export const syncSlice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; ran: boolean; error?: string }> => {
    if (!isOwner(context)) return { ok: false, ran: false, error: "Not allowed." };
    const { drainSyncQueue } = await import("@/lib/sheet-sync.server");
    try {
      const drained = await drainSyncQueue();
      return { ok: true, ran: drained.ran };
    } catch (error) {
      return { ok: false, ran: false, error: String(error instanceof Error ? error.message : error) };
    }
  });

/** Refreshes one topic immediately from its lesson, try-it, quiz and lab workbooks. */
export const refreshTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { domain: string; topicId: string }) => ({
    domain: input.domain.trim(),
    topicId: input.topicId.trim(),
  }))
  .handler(async ({ context, data }): Promise<{ ok: boolean; summary?: SyncRunSummary; error?: string }> => {
    if (!isOwner(context)) return { ok: false, error: "Not allowed." };
    if (!data.domain || !data.topicId) return { ok: false, error: "The topic could not be identified." };

    const { runSheetSync } = await import("@/lib/sheet-sync.server");
    const result = await runSheetSync({
      domain: data.domain,
      topicId: data.topicId,
      force: true,
    });
    if (!result.ok) return { ok: false, error: result.error ?? "The topic could not be refreshed." };
    return {
      ok: true,
      summary: {
        skipped: result.skipped ?? null,
        topics: result.topics ?? 0,
        approved: result.approved ?? 0,
        rejected: result.rejected ?? 0,
        lessonsApproved: result.lessonsApproved ?? 0,
        lessonsRejected: result.lessonsRejected ?? 0,
        workTopics: result.workTopics ?? 0,
        unchangedFiles: result.unchangedFiles ?? 0,
        lessonIssues: result.lessonIssues ?? [],
        report: result.report ?? [],
      },
    };
  });

/** The latest few runs, newest first, for the Settings panel. */
export const syncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; runs: SyncRunStatus[]; error?: string }> => {
    if (!isOwner(context)) return { ok: false, runs: [], error: "Not allowed." };

    const supabaseAdmin = await adminClient();
    if (!supabaseAdmin) return { ok: false, runs: [], error: UNAVAILABLE } as never;
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

export interface SyncAdviceFixProposal {
  ok: boolean;
  owner: boolean;
  domain: string;
  topicId: string;
  reason: string;
  claim?: string;
  correction?: string;
  error?: string;
}

/**
 * Prepares one targeted repair for a sync quality note. This never writes.
 * The owner must review and confirm the exact before/after text in the UI,
 * after which the existing workbook correction path performs the edit.
 */
export const proposeSyncAdviceFix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { domain: string; topicId: string; reason: string }) => ({
    domain: input.domain.trim(),
    topicId: input.topicId.trim(),
    reason: input.reason.trim(),
  }))
  .handler(async ({ context, data }): Promise<SyncAdviceFixProposal> => {
    if (!isOwner(context)) return { ok: false, owner: false, domain: data.domain, topicId: data.topicId, reason: data.reason, error: "Not allowed." };
    const supabaseAdmin = await adminClient();
    if (!supabaseAdmin) return { ok: false, owner: true, domain: data.domain, topicId: data.topicId, reason: data.reason, error: UNAVAILABLE };

    const { data: row, error } = await supabaseAdmin
      .from("owner_lessons")
      .select("lesson")
      .eq("domain", data.domain)
      .eq("topic_id", data.topicId)
      .eq("status", "approved")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !row?.lesson) {
      return { ok: false, owner: true, domain: data.domain, topicId: data.topicId, reason: data.reason, error: error?.message ?? "The imported lesson could not be found." };
    }

    const lessonJson = JSON.stringify(row.lesson);
    const { runAi } = await import("@/lib/ai/run.server");
    const reply = await runAi({
      feature: "self_check",
      system: [
        "You are preparing one narrowly targeted repair to an educational workbook.",
        "Fix only the supplied quality finding. Do not broadly rewrite or add unrelated material.",
        "The claim MUST be one exact, verbatim text substring already present in the supplied lesson JSON and should be the smallest complete passage that can be safely replaced.",
        "The correction must be complete replacement text for that same passage, preserve the original meaning unless the finding requires clarification, and remain suitable for an intelligent adult beginner.",
        "Do not alter factual claims unless necessary to resolve the stated finding.",
        "If the finding cannot be safely fixed by replacing one existing text passage, return ok false.",
        "Return JSON only: {\"ok\":boolean,\"claim\":\"exact existing text\",\"correction\":\"complete replacement text\",\"error\":\"reason when not fixable\"}.",
      ].join("\n"),
      prompt: `Quality finding: ${data.reason}\n\nImported lesson JSON:\n${lessonJson.slice(0, 24000)}`,
      risk: "low",
      priority: "interactive",
      json: true,
      requireCapable: true,
      skipBudget: true,
    });
    if (!reply.ok) {
      return { ok: false, owner: true, domain: data.domain, topicId: data.topicId, reason: data.reason, error: reply.error };
    }
    try {
      const start = reply.text.indexOf("{");
      const end = reply.text.lastIndexOf("}");
      const parsed = JSON.parse(reply.text.slice(start, end + 1)) as { ok?: boolean; claim?: string; correction?: string; error?: string };
      const claim = parsed.claim?.trim() ?? "";
      const correction = parsed.correction?.trim() ?? "";
      if (!parsed.ok || !claim || !correction) {
        return { ok: false, owner: true, domain: data.domain, topicId: data.topicId, reason: data.reason, error: parsed.error ?? "This advice needs manual review." };
      }
      if (!lessonJson.includes(claim)) {
        return { ok: false, owner: true, domain: data.domain, topicId: data.topicId, reason: data.reason, error: "The proposed repair did not identify exact existing workbook text, so nothing was changed." };
      }
      if (claim === correction) {
        return { ok: false, owner: true, domain: data.domain, topicId: data.topicId, reason: data.reason, error: "The proposed repair would not change the lesson." };
      }
      return { ok: true, owner: true, domain: data.domain, topicId: data.topicId, reason: data.reason, claim, correction };
    } catch {
      return { ok: false, owner: true, domain: data.domain, topicId: data.topicId, reason: data.reason, error: "The repair proposal could not be read." };
    }
  });

/** Clears a stuck sync so a new one can start. Owner only. */
export const clearSyncLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; error?: string }> => {
    if (!isOwner(context)) return { ok: false, error: "Not allowed." };

    const supabaseAdmin = await adminClient();
    if (!supabaseAdmin) return { ok: false, runs: [], error: UNAVAILABLE } as never;
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
