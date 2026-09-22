/**
 * How individual checks roll up into the four answers on the first screen.
 *
 * The rule that matters: a check that has never run is unknown, and unknown
 * never reads as healthy.
 */
import type { AdminOverview, AreaHealth, HealthArea, HealthCheck, HealthState } from "./types";

const ORDER: Record<HealthState, number> = { failed: 3, warning: 2, unknown: 1, healthy: 0 };

/** The worst state in a list. No checks at all means nothing is known. */
export function worstState(states: HealthState[]): HealthState {
  if (states.length === 0) return "unknown";
  return states.reduce((worst, state) => (ORDER[state] > ORDER[worst] ? state : worst), "healthy" as HealthState);
}

export function areaHealth(area: HealthArea, checks: HealthCheck[], lastRunAt: string | null): AreaHealth {
  const scoped = checks.filter((check) => check.area === area);
  const state = lastRunAt === null && scoped.length === 0 ? "unknown" : worstState(scoped.map((c) => c.state));
  return { area, state, checks: scoped, lastRunAt };
}

/**
 * An optional outside resource failing must not make the whole app look
 * offline; a broken engine, corrupted assessment or database failure must.
 */
const CRITICAL_AREAS: HealthArea[] = ["system", "engine", "content"];

export function buildOverview(areas: AreaHealth[]): AdminOverview {
  const by = (area: HealthArea) => areas.find((item) => item.area === area);
  const working = worstState([by("system")?.state ?? "unknown", by("performance")?.state ?? "unknown"]);
  const content = worstState([by("content")?.state ?? "unknown", by("imports")?.state ?? "unknown"]);
  const blockingChecks = areas
    .filter((area) => CRITICAL_AREAS.includes(area.area))
    .flatMap((area) => area.checks)
    .filter((check) => check.state === "failed");
  const blocking: HealthState = blockingChecks.length > 0
    ? "failed"
    : areas.some((area) => CRITICAL_AREAS.includes(area.area) && area.state === "unknown")
      ? "unknown"
      : "healthy";
  const attention = worstState(areas.map((area) => area.state));
  const runTimes = areas.map((area) => area.lastRunAt).filter((value): value is string => Boolean(value)).sort();
  return { working, content, blocking, attention, areas, lastRunAt: runTimes.at(-1) ?? null };
}

export type HealthFilter = "all" | "critical" | "warning" | "review" | "healthy" | "unknown";

export function matchesFilter(check: HealthCheck, filter: HealthFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "critical":
      return check.state === "failed";
    case "warning":
      return check.state === "warning";
    case "review":
      return check.state === "failed" || check.state === "warning";
    case "healthy":
      return check.state === "healthy";
    case "unknown":
      return check.state === "unknown";
  }
}

export function filterChecks(
  checks: HealthCheck[],
  options: { filter?: HealthFilter; area?: HealthArea | "all"; topicId?: string } = {},
): HealthCheck[] {
  const filter = options.filter ?? "all";
  return checks.filter((check) => {
    if (!matchesFilter(check, filter)) return false;
    if (options.area && options.area !== "all" && check.area !== options.area) return false;
    if (options.topicId && check.subjectId !== options.topicId) return false;
    return true;
  });
}

export function stateLabel(state: HealthState): string {
  switch (state) {
    case "healthy":
      return "Healthy";
    case "warning":
      return "Warning";
    case "failed":
      return "Failed";
    case "unknown":
      return "Not yet checked";
  }
}
