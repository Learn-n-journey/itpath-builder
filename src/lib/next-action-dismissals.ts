/**
 * Dismissed "do this next" suggestions.
 *
 * A dismissal remembers the action id together with its label. If the label
 * changes later (for example "Clear 3 due reviews" becomes "Clear 5 due
 * reviews"), the situation has changed and the suggestion comes back on its
 * own. Stored locally so it survives reloads; it is a preference, not
 * learning evidence, so it stays out of the synced user record.
 */
import type { NextAction } from "@/lib/next-action";

const KEY = "itpath:dismissed-next-actions:v1";

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
    // Storage unavailable; dismissal just will not persist.
  }
}

export function dismissNextAction(action: NextAction): void {
  const map = load();
  map[action.id] = action.label;
  save(map);
}

export function clearDismissedNextActions(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Actions not dismissed, or dismissed under a label that has since changed. */
export function visibleNextActions(actions: NextAction[]): NextAction[] {
  const dismissed = load();
  return actions.filter((action) => dismissed[action.id] !== action.label);
}
