/**
 * Cost tracking for every AI call in the app.
 *
 * One row per call, including the ones that cost nothing because a cached
 * answer was reused — those rows carry the saving instead of the cost, which is
 * what makes the internal dashboard able to show what the cache is worth.
 *
 * Recording never blocks or fails a real request.
 */
import type { AiFeature, AiOutcome, AiPriority, AiRisk } from "./types";

export interface AiEvent {
  userId?: string | undefined;
  feature: AiFeature;
  model?: string | undefined;
  outcome: AiOutcome;
  risk?: AiRisk | undefined;
  priority?: AiPriority | undefined;
  escalated?: boolean;
  selfChecked?: boolean;
  promptTokens?: number;
  completionTokens?: number;
  estCost?: number;
  savedCost?: number;
  durationMs?: number;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function recordAiEvent(event: AiEvent): Promise<void> {
  try {
    const db = await admin();
    await db.from("ai_events").insert({
      user_id: event.userId ?? null,
      feature: event.feature,
      model: event.model ?? null,
      outcome: event.outcome,
      risk: event.risk ?? null,
      priority: event.priority ?? null,
      escalated: event.escalated ?? false,
      self_checked: event.selfChecked ?? false,
      prompt_tokens: Math.round(event.promptTokens ?? 0),
      completion_tokens: Math.round(event.completionTokens ?? 0),
      est_cost: Number((event.estCost ?? 0).toFixed(6)),
      saved_cost: Number((event.savedCost ?? 0).toFixed(6)),
      duration_ms: Math.round(event.durationMs ?? 0),
    } as never);
  } catch {
    /* telemetry is never allowed to break a feature */
  }
}
