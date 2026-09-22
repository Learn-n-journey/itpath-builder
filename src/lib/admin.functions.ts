/**
 * Owner-only admin server functions.
 *
 * Every function checks the owner email from the verified bearer token, so
 * the page guard is never the security boundary. Nothing here writes learner
 * data, and nothing returns keys, tokens or personal learner content.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ActivityEntry, ContentVersion, FlowCounter, HealthCheck } from "@/lib/admin/types";
import { canRollback, canTransition, rollbackTarget } from "@/lib/admin/release";

export function isOwnerEmail(email: string | undefined | null): boolean {
  return OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
}

function emailOf(context: { claims: unknown }): string | undefined {
  return (context.claims as { email?: string } | null)?.email;
}

export interface SystemHealthReply {
  ok: boolean;
  owner: boolean;
  checks: HealthCheck[];
  ranAt: string;
}

/** Live checks of the services IT PATH depends on. Read-only. */
export const systemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SystemHealthReply> => {
    const ranAt = new Date().toISOString();
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, checks: [], ranAt };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const checks: HealthCheck[] = [];
    const push = (
      id: string,
      label: string,
      ok: boolean,
      detail: string,
      affects: string,
      action: string,
    ) =>
      checks.push({
        id: `system:${id}`,
        area: "system",
        label,
        state: ok ? "healthy" : "failed",
        detail,
        affects,
        action,
        lastRunAt: ranAt,
      });

    const timed = async (label: string, run: () => Promise<{ error: unknown }>) => {
      const started = Date.now();
      try {
        const { error } = await run();
        return { ok: !error, ms: Date.now() - started, message: error ? String((error as { message?: string }).message ?? error) : "" };
      } catch (error) {
        return { ok: false, ms: Date.now() - started, message: error instanceof Error ? error.message : `${label} failed` };
      }
    };

    const db = await timed("database", async () => await supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }));
    push("database", "Database", db.ok, db.ok ? `Answered in ${db.ms} ms.` : db.message, "Nothing can be saved or loaded.", "Check the backend status, then run this again.");

    const auth = await timed("auth", async () => await supabaseAdmin.from("profiles").select("user_id").limit(1));
    push("auth", "Sign-in service", auth.ok, auth.ok ? "Accounts are reachable." : auth.message, "Nobody can sign in.", "Check the backend status.");

    const content = await timed("content", async () => await supabaseAdmin.from("owner_lessons").select("id", { count: "exact", head: true }));
    push("content", "Content loading", content.ok, content.ok ? "Lesson store is reachable." : content.message, "Lessons fall back to the built-in copy.", "Check the backend, then re-run a sync.");

    const progress = await timed("progress", async () => await supabaseAdmin.from("user_state").select("user_id", { count: "exact", head: true }));
    push("progress", "Progress saving", progress.ok, progress.ok ? "Progress store is reachable." : progress.message, "Learner progress stays on the device only.", "Check the backend status.");

    const assessment = await timed("assessment", async () => await supabaseAdmin.from("owner_questions").select("id", { count: "exact", head: true }));
    push("assessment", "Assessment material", assessment.ok, assessment.ok ? "Question store is reachable." : assessment.message, "Quizzes fall back to the built-in bank.", "Check the backend status.");

    const sync = await timed("sync", async () => await supabaseAdmin.from("sync_queue").select("id", { count: "exact", head: true }));
    push("imports", "Import queue", sync.ok, sync.ok ? "The import queue is reachable." : sync.message, "Spreadsheet imports cannot be started.", "Check the backend status.");

    const slow = [db, auth, content, progress, assessment, sync].filter((result) => result.ms > 2000).length;
    checks.push({
      id: "system:speed",
      area: "performance",
      label: "Service speed",
      state: slow === 0 ? "healthy" : "warning",
      detail: slow === 0 ? "Every service answered quickly." : `${slow} service${slow === 1 ? "" : "s"} took over two seconds.`,
      affects: "Pages feel slow to load.",
      action: slow === 0 ? "Nothing to do." : "Re-run the check; if it stays slow, review the database size and load.",
      lastRunAt: ranAt,
    });

    return { ok: true, owner: true, checks, ranAt };
  });

export interface RecordRunInput {
  area: string;
  scope?: string;
  state: string;
  checks: HealthCheck[];
  summary?: Record<string, unknown>;
  durationMs?: number;
}

/** Stores the result of a health run so the dashboard knows when it last ran. */
export const recordHealthRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: RecordRunInput) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; owner: boolean }> => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Only the failing and warning lines are kept, so the log stays small.
    const kept = data.checks.filter((check) => check.state !== "healthy").slice(0, 200);
    await supabaseAdmin.from("health_runs").insert({
      area: data.area,
      scope: data.scope ?? "all",
      state: data.state,
      checks: kept as unknown as never,
      summary: (data.summary ?? {}) as unknown as never,
      duration_ms: Math.max(0, Math.round(data.durationMs ?? 0)),
      finished_at: new Date().toISOString(),
    });
    return { ok: true, owner: true };
  });

export interface HealthRunRow {
  id: string;
  area: string;
  scope: string;
  state: string;
  checks: HealthCheck[];
  summary: Record<string, unknown>;
  finishedAt: string;
}

/** The most recent run for each area, so "not yet checked" is honest. */
export const lastHealthRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; owner: boolean; runs: HealthRunRow[] }> => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, runs: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("health_runs")
      .select("id, area, scope, state, checks, summary, finished_at")
      .order("finished_at", { ascending: false })
      .limit(60);
    const seen = new Set<string>();
    const runs: HealthRunRow[] = [];
    for (const row of data ?? []) {
      if (seen.has(row.area)) continue;
      seen.add(row.area);
      runs.push({
        id: row.id,
        area: row.area,
        scope: row.scope,
        state: row.state,
        checks: (row.checks as unknown as HealthCheck[]) ?? [],
        summary: (row.summary as unknown as Record<string, unknown>) ?? {},
        finishedAt: row.finished_at,
      });
    }
    return { ok: true, owner: true, runs };
  });

export interface LogActivityInput {
  area: string;
  action: string;
  subject?: string;
  result?: "info" | "pass" | "fail" | "blocked";
  detail?: Record<string, unknown>;
}

export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: LogActivityInput) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; owner: boolean }> => {
    const email = emailOf(context);
    if (!isOwnerEmail(email)) return { ok: true, owner: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_activity").insert({
      area: data.area,
      action: data.action,
      subject: data.subject ?? null,
      result: data.result ?? "info",
      // Only short, non-sensitive summaries are ever written here.
      detail: JSON.parse(JSON.stringify(data.detail ?? {})) as never,
      actor: (email ?? "").split("@")[0] ?? null,
    });
    return { ok: true, owner: true };
  });

export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { area?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<{ ok: boolean; owner: boolean; entries: ActivityEntry[] }> => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, entries: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("admin_activity")
      .select("id, area, action, subject, result, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 100, 300));
    if (data.area) query = query.eq("area", data.area);
    const { data: rows } = await query;
    return {
      ok: true,
      owner: true,
      entries: (rows ?? []).map((row) => ({
        id: row.id,
        area: row.area,
        action: row.action,
        subject: row.subject,
        result: row.result as ActivityEntry["result"],
        detail: (row.detail as unknown as Record<string, unknown>) ?? {},
        createdAt: row.created_at,
      })),
    };
  });

function toVersion(row: Record<string, unknown>): ContentVersion {
  return {
    id: String(row['id']),
    domain: String(row['domain']),
    topicId: String(row['topic_id']),
    kind: String(row['kind']),
    contentHash: String(row['content_hash']),
    status: row['status'] as ContentVersion["status"],
    sourceFile: String(row['source_file'] ?? ""),
    note: (row['note'] as string | null) ?? null,
    validation: (row['validation'] as ContentVersion["validation"]) ?? { passed: false, blocking: 0, warnings: 0, findings: [] },
    importedAt: String(row['imported_at']),
    validatedAt: (row['validated_at'] as string | null) ?? null,
    approvedAt: (row['approved_at'] as string | null) ?? null,
    publishedAt: (row['published_at'] as string | null) ?? null,
    supersededAt: (row['superseded_at'] as string | null) ?? null,
    rolledBackAt: (row['rolled_back_at'] as string | null) ?? null,
  };
}

export const listVersions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topicId?: string; limit?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }): Promise<{ ok: boolean; owner: boolean; versions: ContentVersion[] }> => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, versions: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("content_versions")
      .select("*")
      .order("imported_at", { ascending: false })
      .limit(Math.min(data.limit ?? 100, 400));
    if (data.topicId) query = query.eq("topic_id", data.topicId);
    const { data: rows } = await query;
    return { ok: true, owner: true, versions: (rows ?? []).map((row) => toVersion(row as unknown as Record<string, unknown>)) };
  });

const recordSchema = z.object({
  domain: z.string().min(1),
  topicId: z.string().min(1),
  kind: z.string().min(1),
  contentHash: z.string().min(1),
  sourceFile: z.string().default(""),
  payload: z.record(z.string(), z.unknown()).default({}),
  validation: z
    .object({ passed: z.boolean(), blocking: z.number(), warnings: z.number(), findings: z.array(z.string()) })
    .optional(),
  note: z.string().optional(),
});

/**
 * Records an imported version and, when validation results are supplied,
 * moves it to Validated or blocks it. Importing alone never goes live.
 */
export const recordImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => recordSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean; owner: boolean; version?: ContentVersion; error?: string }> => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const validation = data.validation;
    const status = !validation ? "imported" : validation.passed ? "validated" : "rejected";
    const { data: row, error } = await supabaseAdmin
      .from("content_versions")
      .insert({
        domain: data.domain,
        topic_id: data.topicId,
        kind: data.kind,
        content_hash: data.contentHash,
        source_file: data.sourceFile,
        payload: data.payload as never,
        validation: (validation ?? { passed: false, blocking: 0, warnings: 0, findings: [] }) as never,
        status,
        note: data.note ?? null,
        validated_at: validation ? now : null,
      })
      .select("*")
      .single();
    if (error) return { ok: false, owner: true, error: error.message };
    await supabaseAdmin.from("admin_activity").insert({
      area: "imports",
      action: validation ? (validation.passed ? "validated" : "validation failed") : "imported",
      subject: `${data.topicId} ${data.kind}`,
      result: validation ? (validation.passed ? "pass" : "blocked") : "info",
      detail: { hash: data.contentHash, file: data.sourceFile, blocking: validation?.blocking ?? 0, warnings: validation?.warnings ?? 0 } as never,
    });
    return { ok: true, owner: true, version: toVersion(row as unknown as Record<string, unknown>) };
  });

async function loadVersions(topicId: string, kind: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("content_versions")
    .select("*")
    .eq("topic_id", topicId)
    .eq("kind", kind)
    .order("imported_at", { ascending: false });
  return (data ?? []).map((row) => toVersion(row as unknown as Record<string, unknown>));
}

export type ReleaseAction = "preview" | "approve" | "publish" | "reject";

/** Moves one version through the release gate. Owner only, with the rules enforced server-side. */
export const advanceVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { versionId: string; action: ReleaseAction; note?: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; owner: boolean; error?: string; version?: ContentVersion }> => {
    const email = emailOf(context);
    if (!isOwnerEmail(email)) return { ok: true, owner: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("content_versions").select("*").eq("id", data.versionId).single();
    if (!row) return { ok: false, owner: true, error: "That version no longer exists." };
    const version = toVersion(row as unknown as Record<string, unknown>);
    const target = data.action === "approve" ? "approved" : data.action === "publish" ? "live" : data.action === "preview" ? "preview" : "rejected";
    const allowed = canTransition(version.status, target, { validationPassed: version.validation.passed, owner: true });
    if (!allowed.ok) {
      await supabaseAdmin.from("admin_activity").insert({
        area: "release", action: data.action, subject: `${version.topicId} ${version.kind}`, result: "blocked",
        detail: { reason: allowed.reason, from: version.status } as never,
      });
      return { ok: false, owner: true, error: allowed.reason ?? "" };
    }
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: target };
    if (target === "approved") { patch['approved_at'] = now; patch['approved_by'] = (email ?? "").split("@")[0]; }
    if (target === "preview") patch['note'] = data.note ?? version.note;
    if (target === "live") {
      patch['published_at'] = now;
      // The version it replaces is kept, so a rollback always has something to restore.
      await supabaseAdmin
        .from("content_versions")
        .update({ status: "superseded", superseded_at: now })
        .eq("topic_id", version.topicId)
        .eq("kind", version.kind)
        .eq("status", "live");
    }
    const { data: updated, error } = await supabaseAdmin.from("content_versions").update(patch as never).eq("id", version.id).select("*").single();
    if (error) return { ok: false, owner: true, error: error.message };
    await supabaseAdmin.from("admin_activity").insert({
      area: "release", action: data.action, subject: `${version.topicId} ${version.kind}`, result: "pass",
      detail: { from: version.status, to: target, hash: version.contentHash } as never,
    });
    return { ok: true, owner: true, version: toVersion(updated as unknown as Record<string, unknown>) };
  });

/** Puts the previous known-good version back. Never leaves the topic with nothing live. */
export const rollbackVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topicId: string; kind: string; confirm: boolean }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; owner: boolean; error?: string; restoredId?: string }> => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false };
    if (!data.confirm) return { ok: false, owner: true, error: "A rollback has to be confirmed." };
    const versions = await loadVersions(data.topicId, data.kind);
    const allowed = canRollback(versions);
    if (!allowed.ok) return { ok: false, owner: true, error: allowed.reason ?? "" };
    const target = rollbackTarget(versions);
    const live = versions.find((version) => version.status === "live");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    if (live) await supabaseAdmin.from("content_versions").update({ status: "rolled_back", rolled_back_at: now }).eq("id", live.id);
    await supabaseAdmin.from("content_versions").update({ status: "live", published_at: now, superseded_at: null }).eq("id", target!.id);
    await supabaseAdmin.from("admin_activity").insert({
      area: "release", action: "rolled back", subject: `${data.topicId} ${data.kind}`, result: "pass",
      detail: { restored: target!.contentHash, replaced: live?.contentHash ?? null } as never,
    });
    return { ok: true, owner: true, restoredId: target!.id };
  });

export const flowHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; owner: boolean; counters: FlowCounter[] }> => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, counters: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data } = await supabaseAdmin
      .from("flow_events")
      .select("day, flow, outcome, count, slow_count, total_ms")
      .gte("day", since)
      .order("day", { ascending: false });
    return {
      ok: true,
      owner: true,
      counters: (data ?? []).map((row) => ({
        day: row.day,
        flow: row.flow,
        outcome: row.outcome,
        count: row.count,
        slowCount: row.slow_count,
        totalMs: Number(row.total_ms),
      })),
    };
  });

export interface SourceHealthRow {
  url: string;
  kind: string;
  label: string | null;
  ok: boolean;
  status: number | null;
  failCount: number;
  lastError: string | null;
  checkedAt: string | null;
}

export const sourceHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; owner: boolean; rows: SourceHealthRow[] }> => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, rows: [] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("link_checks")
      .select("url, kind, label, ok, status, fail_count, last_error, checked_at")
      .order("ok", { ascending: true })
      .limit(500);
    return {
      ok: true,
      owner: true,
      rows: (data ?? []).map((row) => ({
        url: row.url,
        kind: row.kind,
        label: row.label,
        ok: row.ok,
        status: row.status,
        failCount: row.fail_count,
        lastError: row.last_error,
        checkedAt: row.checked_at,
      })),
    };
  });

export interface ImportHealthReply {
  ok: boolean;
  owner: boolean;
  lessons: { topicId: string; syncedAt: string; hash: string | null; status: string }[];
  questions: { topicId: string; count: number; syncedAt: string }[];
  lastSyncAt: string | null;
}

export const importHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ImportHealthReply> => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, lessons: [], questions: [], lastSyncAt: null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lessons } = await supabaseAdmin
      .from("owner_lessons")
      .select("topic_id, synced_at, content_hash, status")
      .order("synced_at", { ascending: false })
      .limit(300);
    const { data: questions } = await supabaseAdmin
      .from("owner_questions")
      .select("topic_id, synced_at")
      .order("synced_at", { ascending: false })
      .limit(3000);
    const counts = new Map<string, { count: number; syncedAt: string }>();
    for (const row of questions ?? []) {
      const current = counts.get(row.topic_id);
      counts.set(row.topic_id, { count: (current?.count ?? 0) + 1, syncedAt: current?.syncedAt ?? row.synced_at });
    }
    return {
      ok: true,
      owner: true,
      lessons: (lessons ?? []).map((row) => ({ topicId: row.topic_id, syncedAt: row.synced_at, hash: row.content_hash, status: row.status })),
      questions: [...counts.entries()].map(([topicId, value]) => ({ topicId, count: value.count, syncedAt: value.syncedAt })),
      lastSyncAt: lessons?.[0]?.synced_at ?? null,
    };
  });
