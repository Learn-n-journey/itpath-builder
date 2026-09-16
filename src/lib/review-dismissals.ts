/**
 * Cleared "topics to come back to" rows on the dashboard.
 *
 * A row is remembered by its topic id together with the reason it was listed.
 * If the reason changes later (a new review falls due, a fresh mistake opens),
 * the row comes back on its own. Stored locally: it is a preference, not
 * learning evidence, so it stays out of the synced user record.
 */
const KEY = "itpath:cleared-review-topics:v1";

type ReviewRow = { topicId: string; reason: string };

function load(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function save(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable; the row just will not stay cleared.
  }
}

export function clearReviewTopic(row: ReviewRow): void {
  const map = load();
  map[row.topicId] = row.reason;
  save(map);
}

export function restoreClearedReviewTopics(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Rows not cleared, or cleared under a reason that has since changed. */
export function visibleReviewTopics<T extends ReviewRow>(rows: T[]): T[] {
  const cleared = load();
  return rows.filter((row) => cleared[row.topicId] !== row.reason);
}
