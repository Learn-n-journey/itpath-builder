/**
 * Internal AI cost dashboard data. Owner accounts only.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { forecastSpend } from "@/lib/ai/budget.server";
import { FEATURE_LABEL, type AiFeature } from "@/lib/ai/types";

export interface AiFeatureRow {
  feature: string;
  label: string;
  calls: number;
  liveCalls: number;
  cacheHits: number;
  tokens: number;
  cost: number;
  saved: number;
}

export interface AiModelRow {
  model: string;
  calls: number;
  tokens: number;
  cost: number;
}

export interface AiDashboard {
  days: number;
  calls: number;
  liveCalls: number;
  cacheHits: number;
  dedupes: number;
  blocked: number;
  escalations: number;
  selfChecks: number;
  errors: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  saved: number;
  cacheHitRate: number;
  byFeature: AiFeatureRow[];
  byModel: AiModelRow[];
  forecast: { lastDay: number; dailyAverage: number; projectedMonth: number };
}

export type AiDashboardReply =
  | { ok: true; owner: true; data: AiDashboard }
  | { ok: true; owner: false }
  | { ok: false; error: string };

interface EventRow {
  feature: string;
  model: string | null;
  outcome: string;
  escalated: boolean;
  self_checked: boolean;
  prompt_tokens: number;
  completion_tokens: number;
  est_cost: number;
  saved_cost: number;
}

export const getAiDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ days: z.number().min(1).max(90).default(7) }).parse(data))
  .handler(async ({ context, data }): Promise<AiDashboardReply> => {
    const email = ((context.claims as { email?: string } | null)?.email ?? "").trim().toLowerCase();
    if (!OWNER_EMAILS.includes(email)) return { ok: true, owner: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 86_400_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("ai_events")
      .select("feature, model, outcome, escalated, self_checked, prompt_tokens, completion_tokens, est_cost, saved_cost")
      .gte("created_at", since)
      .limit(20000);
    if (error) return { ok: false, error: error.message };

    const events = (rows ?? []) as unknown as EventRow[];
    const features = new Map<string, AiFeatureRow>();
    const models = new Map<string, AiModelRow>();

    const dash: AiDashboard = {
      days: data.days,
      calls: events.length,
      liveCalls: 0,
      cacheHits: 0,
      dedupes: 0,
      blocked: 0,
      escalations: 0,
      selfChecks: 0,
      errors: 0,
      promptTokens: 0,
      completionTokens: 0,
      cost: 0,
      saved: 0,
      cacheHitRate: 0,
      byFeature: [],
      byModel: [],
      forecast: { lastDay: 0, dailyAverage: 0, projectedMonth: 0 },
    };

    for (const row of events) {
      const cost = Number(row.est_cost ?? 0);
      const saved = Number(row.saved_cost ?? 0);
      const tokens = (row.prompt_tokens ?? 0) + (row.completion_tokens ?? 0);
      const cached = row.outcome === "cache_exact" || row.outcome === "cache_semantic";

      if (row.outcome === "live") dash.liveCalls += 1;
      if (cached) dash.cacheHits += 1;
      if (row.outcome === "deduped") dash.dedupes += 1;
      if (row.outcome === "budget_blocked" || row.outcome === "priority_skipped") dash.blocked += 1;
      if (row.outcome === "error") dash.errors += 1;
      if (row.escalated) dash.escalations += 1;
      if (row.feature === "self_check") dash.selfChecks += 1;

      dash.promptTokens += row.prompt_tokens ?? 0;
      dash.completionTokens += row.completion_tokens ?? 0;
      dash.cost += cost;
      dash.saved += saved;

      const key = row.feature;
      const entry = features.get(key) ?? {
        feature: key,
        label: FEATURE_LABEL[key as AiFeature] ?? key,
        calls: 0,
        liveCalls: 0,
        cacheHits: 0,
        tokens: 0,
        cost: 0,
        saved: 0,
      };
      entry.calls += 1;
      if (row.outcome === "live") entry.liveCalls += 1;
      if (cached) entry.cacheHits += 1;
      entry.tokens += tokens;
      entry.cost += cost;
      entry.saved += saved;
      features.set(key, entry);

      if (row.model && row.outcome === "live") {
        const modelRow = models.get(row.model) ?? { model: row.model, calls: 0, tokens: 0, cost: 0 };
        modelRow.calls += 1;
        modelRow.tokens += tokens;
        modelRow.cost += cost;
        models.set(row.model, modelRow);
      }
    }

    const cacheable = dash.liveCalls + dash.cacheHits + dash.dedupes;
    dash.cacheHitRate = cacheable === 0 ? 0 : (dash.cacheHits + dash.dedupes) / cacheable;
    dash.byFeature = [...features.values()].sort((a, b) => b.calls - a.calls);
    dash.byModel = [...models.values()].sort((a, b) => b.cost - a.cost);

    const forecast = await forecastSpend(Math.min(data.days, 30));
    dash.forecast = {
      lastDay: forecast.lastDay,
      dailyAverage: forecast.dailyAverage,
      projectedMonth: forecast.projectedMonth,
    };

    return { ok: true, owner: true, data: dash };
  });
