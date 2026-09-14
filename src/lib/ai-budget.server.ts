/**
 * Cost controls for every AI call in the app.
 *
 * Two mechanisms, both server-only:
 *  - a shared answer cache, so identical work is never paid for twice
 *  - a per-person daily allowance, so one heavy user cannot drain the budget
 *
 * Both fail open: if the database is unreachable, the AI call still runs.
 */

export type AiKind = "tutor" | "grading" | "scenario" | "knowledge";

/** Daily calls per person, per kind. Generous for real study, capped for abuse. */
const DAILY_LIMIT: Record<AiKind, number> = {
  tutor: 80,
  grading: 120,
  scenario: 30,
  knowledge: 40,
};

const LIMIT_MESSAGE: Record<AiKind, string> = {
  tutor: "You have reached today's AI tutor limit. It resets tomorrow — lessons, quizzes and labs still work.",
  grading: "You have reached today's AI marking limit. It resets tomorrow — built-in marking still works.",
  scenario: "You have reached today's limit for AI-written scenarios. The curated and random ones still work.",
  knowledge: "You have reached today's Second Brain AI limit. It resets tomorrow — your saved material is unaffected.",
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/**
 * Records one AI call for this person and says whether it is within today's
 * allowance. Never blocks on a database problem.
 */
export async function allowAiCall(
  userId: string,
  kind: AiKind,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const db = await admin();
    const { data, error } = await db.rpc("bump_ai_usage", {
      _user_id: userId,
      _kind: kind,
      _limit: DAILY_LIMIT[kind],
    });
    if (error) return { ok: true };
    const row = Array.isArray(data) ? data[0] : data;
    const allowed = (row as { allowed?: boolean } | null)?.allowed;
    if (allowed === false) return { ok: false, error: LIMIT_MESSAGE[kind] };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

/** Stable cache key for a piece of AI work. */
export async function aiCacheKey(kind: AiKind, parts: (string | undefined)[]): Promise<string> {
  const text = `${kind}\u0000${parts.filter(Boolean).join("\u0000").toLowerCase().replace(/\s+/g, " ").trim()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${kind}:${hex}`;
}

/** Reads a previously stored answer, or null when nothing is cached. */
export async function readAiCache<T>(cacheKey: string): Promise<T | null> {
  try {
    const db = await admin();
    const { data, error } = await db.from("ai_cache").select("value").eq("cache_key", cacheKey).maybeSingle();
    if (error || !data) return null;
    return (data as { value: T }).value;
  } catch {
    return null;
  }
}

/** Stores an answer for reuse. Failures are ignored: caching is an optimisation. */
export async function writeAiCache(cacheKey: string, kind: AiKind, value: unknown): Promise<void> {
  try {
    const db = await admin();
    await db
      .from("ai_cache")
      .upsert(
        { cache_key: cacheKey, kind, value: value as never },
        { onConflict: "cache_key" },
      );
  } catch {
    /* ignore */
  }
}
