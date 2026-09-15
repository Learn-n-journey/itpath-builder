/**
 * Per-person budgets, call prioritisation and spend forecasting.
 *
 * Three questions, answered before any request reaches the gateway:
 *  1. Has this person already had their share today?
 *  2. Is this call important enough to spend the remainder of that share on?
 *  3. At the current rate, what will the month cost?
 */
import { DAILY_LIMIT, allowAiCall, type AiKind } from "@/lib/ai-budget.server";
import type { AiFeature, AiPriority } from "./types";

export { allowAiCall };

/** The AI layer's features map onto the existing daily allowance buckets. */
export function budgetKindFor(feature: AiFeature): AiKind {
  switch (feature) {
    case "grading":
      return "grading";
    case "scenario":
      return "scenario";
    case "knowledge":
      return "knowledge";
    default:
      return "tutor";
  }
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** How much of today's allowance this person has already used, 0-1. */
export async function usedShare(userId: string, kind: AiKind): Promise<number> {
  try {
    const db = await admin();
    const { data, error } = await db
      .from("ai_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("kind", kind)
      .eq("day", today())
      .maybeSingle();
    if (error || !data) return 0;
    const used = (data as { count: number }).count;
    return Math.min(1, used / Math.max(1, DAILY_LIMIT[kind]));
  } catch {
    return 0;
  }
}

/**
 * Smart prioritisation: when someone is near the end of their daily allowance,
 * what remains is saved for work a person is actually waiting on. Background
 * and optional calls stand aside and fall back to the non-AI path.
 */
export async function allowPriority(
  userId: string,
  kind: AiKind,
  priority: AiPriority,
): Promise<boolean> {
  if (priority === "interactive") return true;
  const share = await usedShare(userId, kind);
  if (priority === "background") return share < 0.8;
  return share < 0.5;
}

export interface SpendForecast {
  /** Credits spent in the last 24 hours. */
  lastDay: number;
  /** Average credits per day over the window. */
  dailyAverage: number;
  /** Straight-line projection for a 30-day month. */
  projectedMonth: number;
  days: number;
}

/** Usage forecasting from recorded events. Returns zeroes when nothing is recorded. */
export async function forecastSpend(days = 7): Promise<SpendForecast> {
  const empty = { lastDay: 0, dailyAverage: 0, projectedMonth: 0, days };
  try {
    const db = await admin();
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const dayAgo = Date.now() - 86_400_000;
    const { data, error } = await db
      .from("ai_events")
      .select("est_cost, created_at")
      .gte("created_at", since)
      .limit(20000);
    if (error || !data?.length) return empty;

    const rows = data as Array<{ est_cost: number; created_at: string }>;
    const total = rows.reduce((sum, row) => sum + Number(row.est_cost ?? 0), 0);
    const lastDay = rows
      .filter((row) => new Date(row.created_at).getTime() >= dayAgo)
      .reduce((sum, row) => sum + Number(row.est_cost ?? 0), 0);
    const dailyAverage = total / days;
    return { lastDay, dailyAverage, projectedMonth: dailyAverage * 30, days };
  } catch {
    return empty;
  }
}
