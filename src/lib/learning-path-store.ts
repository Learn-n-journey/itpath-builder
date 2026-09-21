/**
 * Created learning paths, cached on the device.
 *
 * The database is the source of truth, but the course pack has to be settled
 * before the first render, so the last known list is kept in localStorage and
 * read synchronously. A refresh after sign-in keeps it current.
 */
import { learningPathFromRow, pathKey, type LearningPath } from "@/lib/learning-paths-shared";

const CACHE_KEY = "itpath.learning-paths.v1";

let cached: LearningPath[] | null = null;

function readCache(): LearningPath[] {
  if (cached) return cached;
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? (parsed as LearningPath[]) : [];
  } catch {
    cached = [];
  }
  return cached;
}

function writeCache(paths: LearningPath[]): void {
  cached = paths;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(paths));
  } catch {
    /* storage unavailable; the list simply reloads next time */
  }
}

/** Every created path this device knows about. */
export function learningPaths(): LearningPath[] {
  return readCache();
}

/** One created path by its registry key, e.g. "writing@1.0.0". */
export function learningPathForKey(key: string): LearningPath | undefined {
  return readCache().find((path) => pathKey(path.slug) === key);
}

const listeners = new Set<() => void>();

export function subscribeLearningPaths(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener) as unknown as void;
}

/** Pull the list from the database. Safe to call repeatedly. */
export async function loadLearningPaths(): Promise<LearningPath[]> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("learning_paths")
      .select("slug, name, folder, topics, visible")
      .order("created_at", { ascending: true });
    if (error) return readCache();
    const paths = (data ?? []).map(learningPathFromRow);
    writeCache(paths);
    listeners.forEach((listener) => listener());
    return paths;
  } catch {
    return readCache();
  }
}

/** Store a list the server just returned, without a second round trip. */
export function rememberLearningPaths(paths: LearningPath[]): void {
  writeCache(paths);
  listeners.forEach((listener) => listener());
}
