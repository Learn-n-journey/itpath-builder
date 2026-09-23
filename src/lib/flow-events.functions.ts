/**
 * Everyday journey counters.
 *
 * These are plain counts of whether a step worked, how often it was slow, and
 * nothing else: no user id, no content, no personal data. They are what the
 * control room's "Everyday journeys" panel reads, and without something
 * recording them that panel can only ever say "never run".
 */
import { createServerFn } from "@tanstack/react-start";

/** The only journeys we count. Anything else is ignored. */
export const TRACKED_FLOWS = [
  "Sign in",
  "Open a lesson",
  "Take a quiz",
  "Take an exam",
  "Save progress",
  "Ask the tutor",
] as const;

export type TrackedFlow = (typeof TRACKED_FLOWS)[number];

/** Anything past this feels slow to a learner. */
const SLOW_MS = 4000;

export const recordFlowEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { flow: string; outcome?: "ok" | "failed"; durationMs?: number }) => ({
    flow: String(input?.flow ?? ""),
    outcome: input?.outcome === "failed" ? ("failed" as const) : ("ok" as const),
    durationMs: Math.max(0, Math.min(Math.round(Number(input?.durationMs ?? 0)) || 0, 600000)),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!(TRACKED_FLOWS as readonly string[]).includes(data.flow)) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("bump_flow_event", {
      _flow: data.flow,
      _outcome: data.outcome,
      _duration_ms: data.durationMs,
      _slow: data.durationMs >= SLOW_MS,
    });
    return { ok: !error };
  });

/**
 * Fire and forget from the browser. A counter never blocks or breaks what the
 * learner is doing, so every failure here is swallowed on purpose.
 */
export function trackFlow(flow: TrackedFlow, outcome: "ok" | "failed" = "ok", durationMs = 0): void {
  if (typeof window === "undefined") return;
  void recordFlowEvent({ data: { flow, outcome, durationMs } }).catch(() => undefined);
}
