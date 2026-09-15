/**
 * The engine's rules are deterministic, so they are tested directly: same
 * inputs, same states, same hypotheses, same measured intervention effects.
 */
import { describe, expect, it } from "vitest";

import type { LearnerSignal, LearnerSignalKind } from "@/lib/app-data/types";
import { evidenceStrength, gradedSignals, transferEvidence, velocityFrom } from "./evidence";
import { assessState } from "./states";
import { interventionHistory } from "./interventions";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-06-01T12:00:00.000Z").getTime();

function signal(
  kind: LearnerSignalKind,
  outcome: number,
  daysAgo: number,
  extra: Partial<LearnerSignal> = {},
): LearnerSignal {
  return {
    id: `${kind}-${daysAgo}-${outcome}`,
    topicId: "topic-1",
    kind,
    score: outcome,
    at: new Date(NOW - daysAgo * DAY).toISOString(),
    ...extra,
  };
}

describe("evidence strength", () => {
  it("counts repeated attempts at one activity as a single independent source", () => {
    const graded = gradedSignals([
      signal("quiz", 1, 1),
      signal("quiz", 1, 1),
      signal("quiz", 1, 1),
    ]);
    const strength = evidenceStrength(graded, NOW);
    expect(strength.independentSources).toBe(1);
    expect(strength.level).not.toBe("strong");
  });

  it("treats spread across activities and days as strong", () => {
    const graded = gradedSignals([
      signal("quiz", 1, 30),
      signal("lab", 1, 20),
      signal("practice", 0.9, 10),
      signal("troubleshoot", 0.8, 5),
      signal("recall", 1, 2),
      signal("scenario", 0.9, 1),
      signal("review", 1, 1),
      signal("terminal", 0.8, 0),
    ]);
    expect(evidenceStrength(graded, NOW).level).toBe("strong");
  });

  it("reports no evidence when nothing was graded", () => {
    const exposureOnly: LearnerSignal = {
      id: "lesson-open",
      topicId: "topic-1",
      kind: "lesson",
      at: new Date(NOW - DAY).toISOString(),
    };
    const strength = evidenceStrength(gradedSignals([exposureOnly]), NOW);
    expect(strength.gradedSignals).toBe(0);
    expect(strength.level).toBe("none");
  });
});

describe("transfer", () => {
  it("needs two different non-recall contexts before it counts as demonstrated", () => {
    const one = transferEvidence(gradedSignals([signal("lab", 1, 2)]));
    expect(one.demonstrated).toBe(false);

    const two = transferEvidence(gradedSignals([signal("lab", 1, 2), signal("practice", 0.9, 1)]));
    expect(two.demonstrated).toBe(true);
  });

  it("ignores quiz results entirely", () => {
    const transfer = transferEvidence(gradedSignals([signal("quiz", 1, 1), signal("recall", 1, 1)]));
    expect(transfer.attemptedContexts).toBe(0);
  });
});

describe("learning states", () => {
  const base = {
    mastery: 0.9,
    accuracy: 0.95,
    retention: 0.9,
    evidence: evidenceStrength(
      gradedSignals([
        signal("quiz", 1, 40),
        signal("lab", 1, 30),
        signal("practice", 1, 20),
        signal("scenario", 1, 10),
        signal("recall", 1, 3),
        signal("review", 1, 1),
        signal("terminal", 1, 0),
        signal("troubleshoot", 1, 0),
      ]),
      NOW,
    ),
    transfer: transferEvidence(
      gradedSignals([signal("lab", 1, 30), signal("practice", 1, 20), signal("scenario", 1, 10)]),
    ),
    recentFailureAfterSuccess: false,
    unresolvedMisconception: false,
    passSpanDays: 40,
    daysSinceExposure: 1,
  };

  it("is unknown with no graded work", () => {
    const empty = evidenceStrength([], NOW);
    expect(
      assessState({ ...base, mastery: 0, accuracy: 0, evidence: empty, passSpanDays: 0 }).state,
    ).toBe("unknown");
  });

  it("caps at emerging when a single source carries everything", () => {
    const thin = evidenceStrength(gradedSignals([signal("quiz", 1, 1)]), NOW);
    expect(assessState({ ...base, evidence: thin }).state).toBe("emerging");
  });

  it("drops to fragile after a failure on previously correct material", () => {
    expect(assessState({ ...base, recentFailureAfterSuccess: true }).state).toBe("fragile");
  });

  it("stops at functional when the concept was never applied", () => {
    const noTransfer = transferEvidence(gradedSignals([signal("quiz", 1, 1)]));
    expect(assessState({ ...base, transfer: noTransfer }).state).toBe("functional");
  });

  it("stops at transferable while a misconception is unresolved", () => {
    expect(assessState({ ...base, unresolvedMisconception: true }).state).toBe("transferable");
  });

  it("needs three weeks of passing results before it is retained", () => {
    expect(assessState({ ...base, passSpanDays: 5 }).state).toBe("reliable");
    expect(assessState(base).state).toBe("retained");
  });

  it("always explains what is blocking the next rung", () => {
    expect(assessState({ ...base, passSpanDays: 5 }).blockedBy).toBeTruthy();
  });
});

describe("intervention effectiveness", () => {
  it("measures before and after a teaching event", () => {
    const signals = [
      signal("quiz", 0.2, 20),
      signal("quiz", 0.3, 18),
      signal("lesson", 0, 15),
      signal("quiz", 0.9, 10),
      signal("quiz", 1, 8),
    ];
    const history = interventionHistory(
      gradedSignals(signals),
      signals.map((entry) => ({
        kind: entry.kind,
        atMs: new Date(entry.at).getTime(),
        at: entry.at,
      })),
    );
    const read = history.byMethod.find((effect) => effect.method === "read");
    expect(read?.measured).toBe(1);
    expect(read!.meanDelta).toBeGreaterThan(0);
  });

  it("flags a method that has twice failed to move results", () => {
    const signals = [
      signal("quiz", 0.3, 60),
      signal("lesson", 0, 55),
      signal("quiz", 0.3, 50),
      signal("lesson", 0, 45),
      signal("quiz", 0.25, 40),
    ];
    const history = interventionHistory(
      gradedSignals(signals),
      signals.map((entry) => ({
        kind: entry.kind,
        atMs: new Date(entry.at).getTime(),
        at: entry.at,
      })),
    );
    expect(history.ineffective).toContain("read");
    expect(history.bestMethod).toBeNull();
  });
});

describe("velocity", () => {
  it("is zero until there are enough recent results", () => {
    expect(velocityFrom(gradedSignals([signal("quiz", 1, 1)]), NOW)).toBe(0);
  });

  it("is positive when recent results beat earlier ones", () => {
    const graded = gradedSignals([
      signal("quiz", 0.2, 20),
      signal("quiz", 0.3, 18),
      signal("quiz", 0.9, 4),
      signal("quiz", 1, 2),
    ]);
    expect(velocityFrom(graded, NOW)).toBeGreaterThan(0);
  });
});
