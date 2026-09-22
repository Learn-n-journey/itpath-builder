import { describe, expect, it } from "vitest";

import { areaHealth, buildOverview, filterChecks, stateLabel, worstState } from "./health-state";
import type { HealthCheck } from "./types";

const check = (part: Partial<HealthCheck>): HealthCheck => ({
  id: part.id ?? "x",
  area: part.area ?? "system",
  label: "check",
  state: part.state ?? "healthy",
  detail: "",
  affects: "",
  action: "",
  ...(part.subjectId ? { subjectId: part.subjectId } : {}),
});

describe("health state", () => {
  it("treats a check that never ran as unknown, never healthy", () => {
    expect(worstState([])).toBe("unknown");
    expect(areaHealth("system", [], null).state).toBe("unknown");
    expect(stateLabel("unknown")).toBe("Not yet checked");
  });

  it("reports the worst state in an area", () => {
    const checks = [check({ state: "healthy" }), check({ id: "y", state: "warning" })];
    expect(areaHealth("system", checks, "2026-01-01T00:00:00.000Z").state).toBe("warning");
    expect(worstState(["healthy", "unknown", "failed", "warning"])).toBe("failed");
  });

  it("a failed outside source does not make the app look broken, a failed engine does", () => {
    const sources = areaHealth("sources", [check({ area: "sources", state: "failed" })], "now");
    const system = areaHealth("system", [check({ area: "system", state: "healthy" })], "now");
    const content = areaHealth("content", [check({ area: "content", state: "healthy" })], "now");
    const engineOk = areaHealth("engine", [check({ area: "engine", state: "healthy" })], "now");
    const performance = areaHealth("performance", [check({ area: "performance", state: "healthy" })], "now");

    const good = buildOverview([sources, system, content, engineOk, performance]);
    expect(good.working).toBe("healthy");
    expect(good.blocking).toBe("healthy");
    expect(good.attention).toBe("failed");

    const engineBad = areaHealth("engine", [check({ area: "engine", state: "failed" })], "now");
    expect(buildOverview([sources, system, content, engineBad, performance]).blocking).toBe("failed");
  });

  it("says blocking is unknown while critical areas have never been checked", () => {
    const overview = buildOverview([areaHealth("sources", [], "now")]);
    expect(overview.blocking).toBe("unknown");
    expect(overview.content).toBe("unknown");
  });

  it("filters by state, area and topic", () => {
    const checks = [
      check({ id: "a", state: "failed", area: "content", subjectId: "topic-1" }),
      check({ id: "b", state: "warning", area: "content", subjectId: "topic-2" }),
      check({ id: "c", state: "healthy", area: "system" }),
      check({ id: "d", state: "unknown", area: "engine" }),
    ];
    expect(filterChecks(checks, { filter: "critical" }).map((c) => c.id)).toEqual(["a"]);
    expect(filterChecks(checks, { filter: "review" }).map((c) => c.id)).toEqual(["a", "b"]);
    expect(filterChecks(checks, { filter: "unknown" }).map((c) => c.id)).toEqual(["d"]);
    expect(filterChecks(checks, { area: "content" }).map((c) => c.id)).toEqual(["a", "b"]);
    expect(filterChecks(checks, { topicId: "topic-2" }).map((c) => c.id)).toEqual(["b"]);
  });
});
