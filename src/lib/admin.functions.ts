/**
 * Owner-only server functions behind the control room.
 *
 * Everything here is gated on the owner's signed-in email. A non-owner gets
 * empty data rather than an error, so the page can never leak anything.
 * Nothing in this file touches a learner's progress or mastery records.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import type {
  ActivityEntry,
  ContentStatus,
  ContentVersion,
  DetailBag,
  FlowCounter,
  HealthCheck,
  HealthState,
} from "@/lib/admin/types";
import { canRollback, canTransition, rollbackTarget } from "@/lib/admin/release";

export function isOwnerEmail(email: string | null | undefined): boolean {
  return OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
}

function emailOf(context: { claims: unknown }): string | null {
  return (context.claims as { email?: string } | null)?.email ?? null;
}

interface VersionRow {
  id: string;
  domain: string;
  topic_id: string;
  kind: string;
  content_hash: string;
  status: string;
  source_file: string;
  note: string | null;
  validation: unknown;
  imported_at: string;
  validated_at: string | null;
  approved_at: string | null;
  published_at: string | null;
  superseded_at: string | null;
  rolled_back_at: string | null;
}

function toVersion(row: VersionRow): ContentVersion {
  const validation = (row.validation ?? {}) as Partial<ContentVersion["validation"]>;
  return {
    id: row.id,
    domain: row.domain,
    topicId: row.topic_id,
    kind: row.kind,
    contentHash: row.content_hash,
    status: row.status as ContentStatus,
    sourceFile: row.source_file,
    note: row.note,
    validation: {
      passed: validation.passed ?? false,
      blocking: validation.blocking ?? 0,
      warnings: validation.warnings ?? 0,
      findings: validation.findings ?? [],
    },
    importedAt: row.imported_at,
    validatedAt: row.validated_at,
    approvedAt: row.approved_at,
    publishedAt: row.published_at,
    supersededAt: row.superseded_at,
    rolledBackAt: row.rolled_back_at,
  };
}

async function writeActivity(input: {
  area: string;
  action: string;
  subject?: string | null;
  result: ActivityEntry["result"];
  detail?: DetailBag;
  actor?: string | null;
}): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_activity").insert({
    area: input.area,
    action: input.action,
    subject: input.subject ?? null,
    result: input.result,
    detail: input.detail ?? {},
    actor: input.actor ?? null,
  });
}


export interface FactualChallengeResult {
  id: string;
  label: string;
  injected: string;
  detected: boolean;
  issues: string[];
  corrected: string;
  model: string | null;
}

/**
 * Owner-only adversarial factual check. The verifier is told only to audit the
 * supplied teaching text; it is NOT told what fact was changed or what the
 * expected correction is. Test strings live here and never touch course data.
 */
export const factualQualityChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isOwnerEmail(emailOf(context))) return { owner: false, results: [] as FactualChallengeResult[] };

    const { runAi } = await import("@/lib/ai/run.server");
    const { checkTechnicalClaims } = await import("@/lib/technical-validation");

    const cases = [
      { id: "ssh-port", label: "Incorrect SSH port", text: "SSH commonly uses TCP port 23 for remote administration." },
      { id: "cidr-hosts", label: "Incorrect CIDR host count", text: "A /24 IPv4 network provides 126 usable host addresses." },
      { id: "bits-bytes", label: "Incorrect bits-to-bytes conversion", text: "Eight bits equals two bytes." },
      { id: "https-port", label: "Incorrect HTTPS port", text: "HTTPS commonly uses TCP port 80." },
    ];

    const results: FactualChallengeResult[] = [];
    for (const item of cases) {
      // Deterministic technical validation is part of the real production
      // factual safety layer. It provides an independent non-AI signal.
      const deterministic = checkTechnicalClaims(item.text);

      const reply = await runAi({
        feature: "self_check",
        system: [
          "You are an independent senior technical fact checker reviewing educational material before publication.",
          "Find factual errors only. Do not rewrite for style.",
          "You are not told whether this text contains an error. Decide independently.",
          "For every factual error, state the incorrect claim and a concise correction.",
          "Return JSON only: {\"ok\": boolean, \"issues\": [\"...\"], \"corrected\": \"corrected text, or empty when already correct\"}.",
        ].join("\n"),
        prompt: `Audit this teaching text for factual accuracy:\n\n${item.text}`,
        risk: "low",
        priority: "interactive",
        json: true,
        requireCapable: true,
        skipBudget: true,
      });

      let aiIssues: string[] = [];
      let corrected = "";
      let aiDetected = false;
      let model: string | null = null;
      if (reply.ok) {
        model = reply.model;
        try {
          const start = reply.text.indexOf("{");
          const end = reply.text.lastIndexOf("}");
          const parsed = JSON.parse(reply.text.slice(start, end + 1)) as { ok?: unknown; issues?: unknown; corrected?: unknown };
          aiIssues = Array.isArray(parsed.issues) ? parsed.issues.filter((v): v is string => typeof v === "string") : [];
          corrected = typeof parsed.corrected === "string" ? parsed.corrected : "";
          aiDetected = parsed.ok === false && aiIssues.length > 0;
        } catch {
          aiIssues = ["Verifier returned an unreadable result."];
        }
      } else {
        aiIssues = [reply.error];
      }

      const deterministicIssues = deterministic.map((issue) => issue.problem);
      results.push({
        id: item.id,
        label: item.label,
        injected: item.text,
        detected: aiDetected || deterministicIssues.length > 0,
        issues: [...deterministicIssues, ...aiIssues],
        corrected,
        model,
      });
    }

    await writeActivity({
      area: "content",
      action: "factual_quality_challenge",
      result: results.every((item) => item.detected) ? "passed" : "warning",
      detail: { cases: results.length, caught: results.filter((item) => item.detected).length },
      actor: emailOf(context),
    });

    return { owner: true, results };
  });


export interface TopicFactualFinding {
  claim: string;
  problem: string;
  correction: string;
}

export interface TopicFactualVerification {
  owner: boolean;
  topicId: string;
  sourceFile: string | null;
  ranAt: string;
  state: "healthy" | "warning" | "failed";
  findings: TopicFactualFinding[];
  model: string | null;
  error?: string;
}

/**
 * Owner-only factual audit of the ACTUAL approved lesson imported from the
 * spreadsheet. It reads owner_lessons directly so the verifier never audits a
 * build-time fallback by mistake. Findings are advisory and never edit content.
 */
export const verifyImportedTopicFacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topicId: string }) => ({ topicId: input.topicId.trim() }))
  .handler(async ({ context, data }): Promise<TopicFactualVerification> => {
    const ranAt = new Date().toISOString();
    if (!isOwnerEmail(emailOf(context))) {
      return { owner: false, topicId: data.topicId, sourceFile: null, ranAt, state: "failed", findings: [], model: null, error: "Not allowed." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("owner_lessons")
      .select("topic_id, source_file, lesson, synced_at")
      .eq("topic_id", data.topicId)
      .eq("status", "approved")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !row) {
      return {
        owner: true, topicId: data.topicId, sourceFile: null, ranAt, state: "failed", findings: [], model: null,
        error: error?.message ?? "No approved imported spreadsheet lesson was found for this topic.",
      };
    }

    const lesson = row.lesson as unknown as {
      title?: string; intro?: string; whereYouMeetIt?: string;
      sections?: Array<{ heading?: string; paragraphs?: string[]; bullets?: string[] }>;
      keyTerms?: Array<{ term?: string; meaning?: string }>;
    };
    const text = [
      lesson.title, lesson.intro, lesson.whereYouMeetIt,
      ...(lesson.sections ?? []).flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.bullets ?? [])]),
      ...(lesson.keyTerms ?? []).map((k) => `${k.term ?? ""}: ${k.meaning ?? ""}`),
    ].filter((v): v is string => typeof v === "string" && v.trim().length > 0).join("\n");

    if (text.length < 40) {
      return { owner: true, topicId: data.topicId, sourceFile: row.source_file, ranAt, state: "failed", findings: [], model: null, error: "The imported lesson has too little text to verify." };
    }

    const { checkTechnicalClaims } = await import("@/lib/technical-validation");
    const deterministic = checkTechnicalClaims(text).map((issue) => ({
      claim: issue.claim.trim(),
      problem: issue.problem,
      correction: "",
    }));

    const { runAi } = await import("@/lib/ai/run.server");
    // Long lessons are reviewed in bounded chunks so no single request silently
    // drops the back half of a workbook.
    const chunks: string[] = [];
    const max = 12000;
    for (let start = 0; start < text.length; start += max) chunks.push(text.slice(start, start + max));

    const aiFindings: TopicFactualFinding[] = [];
    let model: string | null = null;
    let verifierFailed = false;
    for (let index = 0; index < chunks.length; index += 1) {
      const reply = await runAi({
        feature: "self_check",
        system: [
          "You are an independent senior technical fact checker reviewing educational material before publication.",
          "Identify factual errors, obsolete technical claims presented as current, incorrect protocol/port/standard behavior, wrong commands or paths, and internally contradictory technical claims.",
          "Do not rewrite for style. Do not flag preferences, simplifications that remain true, or claims you are merely uncertain about.",
          "You are not told whether the lesson contains an error. Decide independently.",
          "Return JSON only: {\"findings\":[{\"claim\":\"exact or concise offending claim\",\"problem\":\"why it is factually wrong\",\"correction\":\"concise corrected fact\"}]}. Return an empty findings array when no factual error is found.",
        ].join("\n"),
        prompt: `Topic: ${lesson.title ?? data.topicId}\nLesson chunk ${index + 1} of ${chunks.length}:\n\n${chunks[index]}`,
        risk: "low",
        priority: "interactive",
        json: true,
        requireCapable: true,
        skipBudget: true,
      });
      if (!reply.ok) { verifierFailed = true; continue; }
      model = reply.model;
      try {
        const start = reply.text.indexOf("{");
        const end = reply.text.lastIndexOf("}");
        const parsed = JSON.parse(reply.text.slice(start, end + 1)) as { findings?: unknown };
        if (Array.isArray(parsed.findings)) {
          for (const finding of parsed.findings) {
            if (!finding || typeof finding !== "object") continue;
            const f = finding as Record<string, unknown>;
            if (typeof f.claim !== "string" || typeof f.problem !== "string") continue;
            aiFindings.push({
              claim: f.claim.trim(),
              problem: f.problem.trim(),
              correction: typeof f.correction === "string" ? f.correction.trim() : "",
            });
          }
        }
      } catch { verifierFailed = true; }
    }

    const findings = [...deterministic, ...aiFindings].filter((finding, index, all) =>
      all.findIndex((other) => other.claim.toLowerCase() === finding.claim.toLowerCase() && other.problem.toLowerCase() === finding.problem.toLowerCase()) === index
    );
    const state = verifierFailed ? "warning" : findings.length > 0 ? "warning" : "healthy";

    await writeActivity({
      area: "content",
      action: "topic_factual_verification",
      subject: data.topicId,
      result: state === "healthy" ? "passed" : "warning",
      detail: { sourceFile: row.source_file, findings: findings.length, chunks: chunks.length, verifierFailed },
      actor: emailOf(context),
    });

    return {
      owner: true, topicId: data.topicId, sourceFile: row.source_file, ranAt, state, findings, model,
      ...(verifierFailed ? { error: "One or more verification chunks could not be reviewed. Run the check again before treating this topic as verified." } : {}),
    };
  });

/** Live checks against the services the app depends on. Reads only. */
export const systemHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ranAt = new Date().toISOString();
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, ranAt, checks: [] as HealthCheck[] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const checks: HealthCheck[] = [];
    const timings: Array<{ label: string; took: number }> = [];

    async function probe(id: string, label: string, affects: string, job: () => Promise<string>) {
      const started = Date.now();
      try {
        const detail = await job();
        const took = Date.now() - started;
        timings.push({ label, took });
        checks.push({
          id,
          area: "system",
          label,
          state: took > 2000 ? "warning" : "healthy",
          detail: `${detail} (${took}ms)`,
          affects,
          action: took > 2000 ? "Watch for repeats; the database may be under load." : "",
          lastRunAt: ranAt,
        });

      } catch (error) {
        checks.push({
          id,
          area: "system",
          label,
          state: "failed",
          detail: error instanceof Error ? error.message : "The check did not answer.",
          affects,
          action: "Open the backend and check the service is running, then run this check again.",
          lastRunAt: ranAt,
        });
      }
    }

    await probe("system:db", "Database", "Everything a learner saves or loads.", async () => {
      const { error, count } = await supabaseAdmin
        .from("learning_paths")
        .select("slug", { count: "exact", head: true });
      if (error) throw new Error(error.message);
      return `Answered with ${count ?? 0} path row${count === 1 ? "" : "s"}.`;
    });

    await probe("system:auth", "Sign in", "People signing in or staying signed in.", async () => {
      const { error } = await supabaseAdmin.from("profiles").select("user_id", { head: true, count: "exact" });
      if (error) throw new Error(error.message);
      return "Account records are reachable.";
    });

    await probe("system:progress", "Saved progress", "Progress and mastery being kept between visits.", async () => {
      const { error } = await supabaseAdmin.from("user_state").select("user_id", { head: true, count: "exact" });
      if (error) throw new Error(error.message);
      return "Progress storage is reachable.";
    });

    await probe("system:content", "Owner content store", "Lessons and questions coming from your workbooks.", async () => {
      const { error, count } = await supabaseAdmin
        .from("owner_questions")
        .select("id", { head: true, count: "exact" })
        .eq("status", "approved");
      if (error) throw new Error(error.message);
      return `${count ?? 0} approved question${count === 1 ? "" : "s"} available.`;
    });

    // Speed always reports, so "Is IT PATH working?" answers instead of
    // sitting on "not yet checked" whenever every service replied quickly.
    const slowest = timings.reduce<{ label: string; took: number } | null>(
      (worst, timing) => (worst === null || timing.took > worst.took ? timing : worst),
      null,
    );
    const answered = timings.length;
    checks.push({
      id: "performance:response",
      area: "performance",
      label: "Speed",
      state: answered === 0 ? "unknown" : slowest && slowest.took > 2000 ? "warning" : "healthy",
      detail:
        answered === 0
          ? "No service answered, so speed could not be measured."
          : `${answered} service${answered === 1 ? "" : "s"} answered; slowest was ${slowest?.label} at ${slowest?.took}ms.`,
      affects: "How quickly pages and saved work respond for everyone.",
      action: slowest && slowest.took > 2000 ? "Watch for repeats; the database may be under load." : "",
      lastRunAt: ranAt,
    });

    return { ok: true, owner: true, ranAt, checks };

  });

/** Keeps a record of a check that was run, so "not yet checked" stays honest. */
export const recordHealthRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      area: string;
      state: HealthState;
      checks: HealthCheck[];
      durationMs: number;
      summary: DetailBag;
      scope?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    await supabaseAdmin.from("health_runs").insert({
      area: data.area,
      scope: data.scope ?? "all",
      state: data.state,
      checks: data.checks as never,
      summary: data.summary as never,
      duration_ms: Math.max(0, Math.round(data.durationMs)),
      started_at: new Date(now.getTime() - Math.max(0, data.durationMs)).toISOString(),
      finished_at: now.toISOString(),
    });
    if (data.state === "failed") {
      await writeActivity({
        area: data.area,
        action: "Health check failed",
        result: "fail",
        detail: { checks: data.checks.length },
        actor: emailOf(context),
      });
    }
    return { ok: true, owner: true };
  });

export interface HealthRunSummary {
  id: string;
  area: string;
  state: HealthState;
  finishedAt: string;
  durationMs: number;
  checks: HealthCheck[];
}

/** The most recent run per area, used to show when each area was last checked. */
export const lastHealthRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, runs: [] as HealthRunSummary[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("health_runs")
      .select("id, area, state, finished_at, duration_ms, checks")
      .order("finished_at", { ascending: false })
      .limit(40);
    const seen = new Set<string>();
    const runs: HealthRunSummary[] = [];
    for (const row of data ?? []) {
      if (seen.has(row.area)) continue;
      seen.add(row.area);
      runs.push({
        id: row.id,
        area: row.area,
        state: row.state as HealthState,
        finishedAt: row.finished_at,
        durationMs: row.duration_ms,
        checks: Array.isArray(row.checks) ? (row.checks as unknown as HealthCheck[]) : [],
      });
    }
    return { ok: true, owner: true, runs };
  });

export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      area: string;
      action: string;
      subject?: string | null;
      result: ActivityEntry["result"];
      detail?: DetailBag;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false };
    await writeActivity({ ...data, actor: emailOf(context) });
    return { ok: true, owner: true };
  });

export const listActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { area?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, entries: [] as ActivityEntry[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("admin_activity")
      .select("id, area, action, subject, result, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 100, 300));
    if (data.area) query = query.eq("area", data.area);
    const { data: rows } = await query;
    const entries: ActivityEntry[] = (rows ?? []).map((row) => ({
      id: row.id,
      area: row.area,
      action: row.action,
      subject: row.subject,
      result: row.result as ActivityEntry["result"],
      detail: (row.detail ?? {}) as DetailBag,
      createdAt: row.created_at,
    }));
    return { ok: true, owner: true, entries };
  });

export const listVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topicId?: string; kind?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, versions: [] as ContentVersion[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("content_versions")
      .select(
        "id, domain, topic_id, kind, content_hash, status, source_file, note, validation, imported_at, validated_at, approved_at, published_at, superseded_at, rolled_back_at",
      )
      .order("imported_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));
    if (data.topicId) query = query.eq("topic_id", data.topicId);
    if (data.kind) query = query.eq("kind", data.kind);
    const { data: rows } = await query;
    return { ok: true, owner: true, versions: (rows ?? []).map((row) => toVersion(row as VersionRow)) };
  });

/** Records an import and its validation result. Failed validation never becomes live. */
export const recordImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      domain: string;
      topicId: string;
      kind: string;
      contentHash: string;
      sourceFile: string;
      payload: unknown;
      note?: string | null;
      validation?: { passed: boolean; blocking: number; warnings: number; findings: string[] } | null;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, version: null as ContentVersion | null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const validation = data.validation ?? null;
    const status: ContentStatus = !validation ? "imported" : validation.passed ? "validated" : "rejected";
    const { data: row, error } = await supabaseAdmin
      .from("content_versions")
      .insert({
        domain: data.domain,
        topic_id: data.topicId,
        kind: data.kind,
        content_hash: data.contentHash,
        status,
        source_file: data.sourceFile,
        note: data.note ?? null,
        payload: data.payload as never,
        validation: (validation ?? { passed: false, blocking: 0, warnings: 0, findings: [] }) as never,
        validated_at: validation ? new Date().toISOString() : null,
      })
      .select(
        "id, domain, topic_id, kind, content_hash, status, source_file, note, validation, imported_at, validated_at, approved_at, published_at, superseded_at, rolled_back_at",
      )
      .single();
    if (error || !row) return { ok: true, owner: true, version: null, error: error?.message ?? "Nothing was saved." };
    await writeActivity({
      area: "imports",
      action: status === "rejected" ? "Import blocked by validation" : "Content imported",
      subject: `${data.topicId} ${data.kind}`,
      result: status === "rejected" ? "blocked" : "pass",
      detail: {
        file: data.sourceFile,
        blocking: validation?.blocking ?? 0,
        warnings: validation?.warnings ?? 0,
      },
      actor: emailOf(context),
    });
    return { ok: true, owner: true, version: toVersion(row as VersionRow) };
  });

/** Moves a version along the release path. Only the owner can approve or publish. */
export const advanceVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { versionId: string; action: "preview" | "approve" | "publish" | "reject" }) => input)
  .handler(async ({ data, context }) => {
    const actor = emailOf(context);
    if (!isOwnerEmail(actor)) return { ok: false, owner: false, error: "Only the owner can do this." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("content_versions")
      .select(
        "id, domain, topic_id, kind, content_hash, status, source_file, note, validation, imported_at, validated_at, approved_at, published_at, superseded_at, rolled_back_at",
      )
      .eq("id", data.versionId)
      .maybeSingle();
    if (!row) return { ok: true, owner: true, error: "That version no longer exists." };
    const version = toVersion(row as VersionRow);

    const target: ContentStatus =
      data.action === "approve"
        ? "approved"
        : data.action === "publish"
          ? "live"
          : data.action === "preview"
            ? "preview"
            : "rejected";
    const allowed = canTransition(version.status, target, {
      validationPassed: version.validation.passed,
      owner: true,
    });
    if (!allowed.ok) {
      await writeActivity({
        area: "releases",
        action: `Blocked: ${data.action}`,
        subject: `${version.topicId} ${version.kind}`,
        result: "blocked",
        detail: { reason: allowed.reason ?? "" },
        actor,
      });
      return { ok: true, owner: true, error: allowed.reason ?? "That step is not allowed yet." };
    }

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: target };
    if (target === "approved") {
      patch['approved_at'] = now;
      patch['approved_by'] = actor;
    }
    if (target === "live") patch['published_at'] = now;
    if (target === "rejected") patch['rolled_back_at'] = now;

    if (target === "live") {
      // The version that was live is kept, just marked as superseded.
      await supabaseAdmin
        .from("content_versions")
        .update({ status: "superseded", superseded_at: now })
        .eq("topic_id", version.topicId)
        .eq("kind", version.kind)
        .eq("status", "live");
    }

    const { error } = await supabaseAdmin.from("content_versions").update(patch as never).eq("id", version.id);
    if (error) return { ok: true, owner: true, error: error.message };

    await writeActivity({
      area: "releases",
      action:
        target === "live" ? "Published" : target === "approved" ? "Approved" : target === "preview" ? "Preview opened" : "Rejected",
      subject: `${version.topicId} ${version.kind}`,
      result: target === "rejected" ? "blocked" : "pass",
      detail: { fingerprint: version.contentHash.slice(0, 12) },
      actor,
    });
    return { ok: true, owner: true, status: target };
  });

/** Puts the last known-good version back. Always confirmed, never silent. */
export const rollbackVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { topicId: string; kind: string; confirm: boolean }) => input)
  .handler(async ({ data, context }) => {
    const actor = emailOf(context);
    if (!isOwnerEmail(actor)) return { ok: false, owner: false, error: "Only the owner can do this." };
    if (!data.confirm) return { ok: false, owner: true, error: "A rollback has to be confirmed." };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("content_versions")
      .select(
        "id, domain, topic_id, kind, content_hash, status, source_file, note, validation, imported_at, validated_at, approved_at, published_at, superseded_at, rolled_back_at",
      )
      .eq("topic_id", data.topicId)
      .eq("kind", data.kind)
      .order("imported_at", { ascending: false });
    const versions = (rows ?? []).map((row) => toVersion(row as VersionRow));
    const allowed = canRollback(versions);
    if (!allowed.ok) return { ok: false, owner: true, error: allowed.reason ?? "There is nothing to go back to." };
    const target = rollbackTarget(versions);
    const live = versions.find((version) => version.status === "live");
    if (!target) return { ok: false, owner: true, error: "There is no earlier good version kept." };

    const now = new Date().toISOString();
    if (live) {
      await supabaseAdmin
        .from("content_versions")
        .update({ status: "rolled_back", rolled_back_at: now })
        .eq("id", live.id);
    }
    await supabaseAdmin
      .from("content_versions")
      .update({ status: "live", published_at: now })
      .eq("id", target.id);

    await writeActivity({
      area: "releases",
      action: "Rolled back",
      subject: `${data.topicId} ${data.kind}`,
      result: "pass",
      detail: { restored: target.contentHash.slice(0, 12), replaced: live?.contentHash.slice(0, 12) ?? null },
      actor,
    });
    return { ok: true, owner: true, restoredId: target.id };
  });

/** Counts for everyday journeys over the last two weeks. No personal data. */
export const flowHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, counters: [] as FlowCounter[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data } = await supabaseAdmin
      .from("flow_events")
      .select("day, flow, outcome, count, slow_count, total_ms")
      .gte("day", since)
      .order("day", { ascending: false });
    const counters: FlowCounter[] = (data ?? []).map((row) => ({
      day: row.day,
      flow: row.flow,
      outcome: row.outcome,
      count: row.count,
      slowCount: row.slow_count,
      totalMs: Number(row.total_ms ?? 0),
    }));
    return { ok: true, owner: true, counters };
  });

export interface SourceHealthRow {
  url: string;
  kind: string;
  label: string | null;
  status: number | null;
  ok: boolean;
  failCount: number;
  lastError: string | null;
  checkedAt: string | null;
}

/** Results of the existing nightly link crawler. Nothing is replaced automatically. */
export const sourceHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!isOwnerEmail(emailOf(context))) return { ok: true, owner: false, rows: [] as SourceHealthRow[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("link_checks")
      .select("url, kind, label, status, ok, fail_count, last_error, checked_at")
      .order("ok", { ascending: true })
      .order("checked_at", { ascending: false })
      .limit(500);
    // Purge stored checks for URLs that no longer exist in the current
    // curriculum (link_checks is keyed by URL). Without this, a replaced or
    // removed source link leaves its old failure row behind and the dashboard
    // keeps reporting problems for links the app no longer uses.
    const { externalLinks } = await import("@/lib/external-links");
    const currentUrls = new Set(externalLinks().map((link) => link.url));
    const staleUrls = [...new Set((data ?? []).map((row) => row.url).filter((url) => !currentUrls.has(url)))];
    if (staleUrls.length > 0) {
      await supabaseAdmin.from("link_checks").delete().in("url", staleUrls);
    }
    const rows: SourceHealthRow[] = (data ?? [])
      .filter((row) => currentUrls.has(row.url))
      .map((row) => ({
        url: row.url,
        kind: row.kind,
        label: row.label,
        status: row.status,
        ok: row.ok,
        failCount: row.fail_count,
        lastError: row.last_error,
        checkedAt: row.checked_at,
      }));
    return { ok: true, owner: true, rows };
  });

export interface ImportHealthReply {
  ok: boolean;
  owner: boolean;
  lastSyncAt: string | null;
  lessons: Array<{ topicId: string; sourceFile: string; hash: string | null; syncedAt: string; status: string }>;
  questions: Array<{ topicId: string; count: number }>;
}

/** What is actually in the owner content store right now. */
export const importHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ImportHealthReply> => {
    if (!isOwnerEmail(emailOf(context))) {
      return { ok: true, owner: false, lastSyncAt: null, lessons: [], questions: [] };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [lessonReply, questionReply] = await Promise.all([
      supabaseAdmin
        .from("owner_lessons")
        .select("topic_id, source_file, content_hash, synced_at, status")
        .order("synced_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("owner_questions").select("topic_id, synced_at").eq("status", "approved").limit(5000),
    ]);
    const lessons = (lessonReply.data ?? []).map((row) => ({
      topicId: row.topic_id,
      sourceFile: row.source_file,
      hash: row.content_hash,
      syncedAt: row.synced_at,
      status: row.status,
    }));
    const byTopic = new Map<string, number>();
    let lastSyncAt: string | null = lessons[0]?.syncedAt ?? null;
    for (const row of questionReply.data ?? []) {
      byTopic.set(row.topic_id, (byTopic.get(row.topic_id) ?? 0) + 1);
      if (!lastSyncAt || row.synced_at > lastSyncAt) lastSyncAt = row.synced_at;
    }
    return {
      ok: true,
      owner: true,
      lastSyncAt,
      lessons,
      questions: [...byTopic.entries()].map(([topicId, count]) => ({ topicId, count })),
    };
  });
