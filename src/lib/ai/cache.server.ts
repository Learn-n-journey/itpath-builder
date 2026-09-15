/**
 * Multi-level response cache for the AI layer.
 *
 * Level 1 — in-flight de-duplication: two identical requests arriving at once
 *           share one gateway call instead of paying twice.
 * Level 2 — exact cache: the same request, word for word, is never paid for
 *           twice by anyone.
 * Level 3 — semantic cache: a near-identical request (same meaning, different
 *           wording) reuses the stored answer, matched deterministically on
 *           shared terms rather than with a paid embedding call.
 *
 * Everything fails open: a cache problem must never stop a real answer.
 */
import { collapse } from "./compress.server";

export type CacheHit = "exact" | "semantic";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function normalize(text: string): string {
  return collapse(text).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Stable key for one exact piece of work. */
export async function cacheKey(feature: string, parts: Array<string | undefined>): Promise<string> {
  const text = parts.filter(Boolean).map((part) => normalize(part as string)).join("\u0000");
  return `${feature}:${await sha256(text)}`;
}

/** Grouping key: only requests of the same shape are compared semantically. */
export async function cacheBucket(feature: string, scope: string): Promise<string> {
  return `${feature}:${(await sha256(normalize(scope))).slice(0, 16)}`;
}

// ---------------------------------------------------------------- level 1

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Runs `work` once per key while it is still running. Later callers with the
 * same key wait for the first result instead of starting a second call.
 */
export async function dedupe<T>(key: string, work: () => Promise<T>): Promise<{ value: T; deduped: boolean }> {
  const running = inFlight.get(key);
  if (running) return { value: (await running) as T, deduped: true };
  const promise = work();
  inFlight.set(key, promise as Promise<unknown>);
  try {
    return { value: await promise, deduped: false };
  } finally {
    inFlight.delete(key);
  }
}

// ---------------------------------------------------------------- level 2/3

export async function readExact<T>(key: string): Promise<T | null> {
  try {
    const db = await admin();
    const { data, error } = await db.from("ai_cache").select("value").eq("cache_key", key).maybeSingle();
    if (error || !data) return null;
    void db.from("ai_cache").update({ last_used_at: new Date().toISOString() } as never).eq("cache_key", key);
    return (data as { value: T }).value;
  } catch {
    return null;
  }
}

function similarity(a: string, b: string): number {
  const left = new Set(a.split(" ").filter((word) => word.length > 2));
  const right = new Set(b.split(" ").filter((word) => word.length > 2));
  if (left.size === 0 || right.size === 0) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/**
 * Finds a stored answer to a question that means the same thing. Compares
 * against recent entries in the same bucket only, so the work stays bounded.
 */
export async function readSemantic<T>(
  bucket: string,
  text: string,
  threshold = 0.9,
  sampleSize = 40,
): Promise<T | null> {
  try {
    const db = await admin();
    const { data, error } = await db
      .from("ai_cache")
      .select("cache_key, norm, value")
      .eq("bucket", bucket)
      .order("last_used_at", { ascending: false })
      .limit(sampleSize);
    if (error || !data?.length) return null;

    const needle = normalize(text);
    let best: { key: string; value: T; score: number } | null = null;
    for (const row of data as Array<{ cache_key: string; norm: string | null; value: T }>) {
      if (!row.norm) continue;
      const score = similarity(needle, row.norm);
      if (score >= threshold && (!best || score > best.score)) {
        best = { key: row.cache_key, value: row.value, score };
      }
    }
    if (!best) return null;
    void db.from("ai_cache").update({ last_used_at: new Date().toISOString() } as never).eq("cache_key", best.key);
    return best.value;
  } catch {
    return null;
  }
}

export async function writeCache(input: {
  key: string;
  feature: string;
  value: unknown;
  bucket?: string | undefined;
  text?: string | undefined;
  model?: string | undefined;
}): Promise<void> {
  try {
    const db = await admin();
    await db.from("ai_cache").upsert(
      {
        cache_key: input.key,
        kind: input.feature,
        value: input.value as never,
        bucket: input.bucket ?? null,
        norm: input.text ? normalize(input.text) : null,
        model: input.model ?? null,
        last_used_at: new Date().toISOString(),
      } as never,
      { onConflict: "cache_key" },
    );
  } catch {
    /* caching is an optimisation, never a requirement */
  }
}
