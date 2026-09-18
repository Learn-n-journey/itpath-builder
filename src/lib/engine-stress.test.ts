/**
 * Stress test for the learning engine.
 *
 * Generates hundreds of randomised learner histories, including hostile ones
 * (unknown topic ids, future timestamps, duplicate and contradictory attempts,
 * very large volumes), and asserts the engines stay honest: no crashes, no NaN,
 * every score inside 0-100, results identical for identical input, and the
 * mastery gate never opens without real evidence.
 */
import { describe, expect, it } from "vitest";

import { createDefaultUserData } from "@/lib/app-data/defaults";
import type { UserData } from "@/lib/app-data/types";
import { topics } from "@/data/static-content";

import { buildIntelligence } from "@/lib/intelligence/engine";
import { buildLearnerModel } from "@/lib/learner-model";
import { adaptiveQueue } from "@/lib/adaptive-engine";
import { computeDashboard } from "@/lib/dashboard-engine";
import { nextActions } from "@/lib/next-action";
import { masteryGate } from "@/lib/mastery-gate";
import { topicScopeProgress, allTopicScopeProgress } from "@/lib/scope-progress";
import { summarizeMistakes } from "@/lib/mistake-engine";
import { scoreAllCertifications } from "@/lib/certification-engine";
import { currentJourneyTopic, isMastered, isTopicOpen, journeyTopics, unlockedByExperience } from "@/lib/journey-order";

import { FINITE, NOW, PERCENT, SHAPES, buildUser } from "@/lib/stress-fixtures";

describe("learning engine stress", () => {
  for (const [name, shape] of SHAPES) {
    it(`survives 40 randomised ${name} histories`, () => {
      for (let seed = 1; seed <= 40; seed += 1) {
        const user = buildUser(seed * 7919 + shape.volume, shape);

        const intelligence = buildIntelligence(user, NOW);
        for (const [topicId, state] of Object.entries(intelligence.byTopic)) {
          expect(typeof state.diagnosis, `${topicId} diagnosis`).toBe("string");
          expect(typeof state.evidence).toBe("string");
        }

        const model = buildLearnerModel(user, NOW);
        expect(Array.isArray(model.profiles)).toBe(true);
        PERCENT(model.pathMastery, "path mastery");

        const queue = adaptiveQueue(user, NOW);
        for (const entry of queue.entries) {
          PERCENT(entry.mastery, `${entry.topic.id} mastery`);
          FINITE(entry.priority, `${entry.topic.id} priority`);
          expect(entry.reason.length, "reason text").toBeGreaterThan(0);
          expect(entry.reason.includes("undefined")).toBe(false);
          expect(entry.reason.includes("NaN")).toBe(false);
        }
        // Ordering must be a real ordering.
        for (let i = 1; i < queue.entries.length; i += 1) {
          expect(queue.entries[i - 1]!.priority).toBeGreaterThanOrEqual(queue.entries[i]!.priority);
        }

        const dashboard = computeDashboard(user, NOW);
        JSON.stringify(dashboard);

        const actions = nextActions(user, NOW);
        for (const action of actions) {
          expect(action.label.length).toBeGreaterThan(0);
          expect(action.reason.includes("NaN")).toBe(false);
          expect(action.to.startsWith("/")).toBe(true);
        }

        for (const topic of journeyTopics(user).slice(0, 12)) {
          const gate = masteryGate(user, topic.id, NOW);
          expect(gate.summary.length, `${topic.id} gate summary`).toBeGreaterThan(0);
          expect(gate.summary.includes("NaN")).toBe(false);
          for (const competency of gate.competencies) {
            PERCENT(competency.score, `${topic.id}/${competency.key}`);
            expect(competency.outstanding).toBeGreaterThanOrEqual(0);
            expect(competency.passed).toBeLessThanOrEqual(competency.available);
          }
          // The gate may only open when every required competency is proven.
          if (gate.met) {
            for (const competency of gate.competencies) {
              if (competency.required) expect(competency.met, `${topic.id} ${competency.key}`).toBe(true);
            }
            expect(gate.delayed.passed, `${topic.id} delayed check`).toBe(true);
          }

          const scope = topicScopeProgress(user, topic.id);
          PERCENT(scope.overall, `${topic.id} scope`);
          const dimensions = ["understanding", "recall", "application", "practicalAbility", "troubleshooting", "retention"] as const;
          for (const key of dimensions) {
            const dimension = scope[key];
            PERCENT(dimension.score, `${topic.id} ${key}`);
            expect(dimension.attempted, `${topic.id} ${key} attempted`).toBeLessThanOrEqual(dimension.available);
            // An unmeasured dimension must never claim a score.
            if (!dimension.measured) expect(dimension.score, `${topic.id} ${key} unmeasured`).toBe(0);
          }
          // Retention is reported separately and never inflates the overall score.
          const abilities = dimensions.slice(0, 5).map((key) => scope[key]).filter((item) => item.measured);
          if (abilities.length > 0 && scope.retention.score === 100 && abilities.every((item) => item.score === 0)) {
            expect(scope.overall, `${topic.id} retention leak`).toBe(0);
          }
        }

        for (const readiness of scoreAllCertifications(user)) {
          PERCENT(readiness.overall, "certification overall");
        }

        const summary = summarizeMistakes(user);
        expect(summary.open).toBeLessThanOrEqual(summary.total);
      }
    }, 30000);
  }

  it("gives identical results for identical histories", () => {
    const a = buildUser(4242, { volume: 40, hostile: false });
    const b = buildUser(4242, { volume: 40, hostile: false });
    expect(JSON.stringify(adaptiveQueue(b, NOW))).toBe(JSON.stringify(adaptiveQueue(a, NOW)));
    expect(JSON.stringify(computeDashboard(b, NOW))).toBe(JSON.stringify(computeDashboard(a, NOW)));
    expect(JSON.stringify(buildIntelligence(b, NOW))).toBe(JSON.stringify(buildIntelligence(a, NOW)));
    expect(JSON.stringify(nextActions(b, NOW))).toBe(JSON.stringify(nextActions(a, NOW)));
  });

  it("keeps a brand new learner honestly at zero", () => {
    const user = createDefaultUserData();
    expect(allTopicScopeProgress(user).every((item) => item.overall === 0)).toBe(true);
    expect(journeyTopics(user).every((topic) => !isMastered(user, topic.id))).toBe(true);
    const current = currentJourneyTopic(user);
    expect(current && isTopicOpen(user, current.id)).toBe(true);
    const dashboard = computeDashboard(user, NOW);
    expect(JSON.stringify(dashboard).includes("NaN")).toBe(false);
  });

  it("never unlocks a later topic before the current one is mastered", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const user = buildUser(seed * 104729, { volume: 30, hostile: false });
      const order = journeyTopics(user);
      const current = currentJourneyTopic(user);
      if (!current) continue;
      const currentIndex = order.findIndex((topic) => topic.id === current.id);
      // Material the experience setting already opened is allowed ahead of the line.
      const openedByExperience = unlockedByExperience(user);
      for (let i = currentIndex + 1; i < order.length; i += 1) {
        const topic = order[i]!;
        if (i < openedByExperience) continue;
        expect(isTopicOpen(user, topic.id), `${topic.id} should be locked`).toBe(false);
      }
    }
  });

  it("stays fast on a very large history", () => {
    const user = buildUser(987654, { volume: 600, hostile: false });
    const started = performance.now();
    buildIntelligence(user, NOW);
    adaptiveQueue(user, NOW);
    computeDashboard(user, NOW);
    nextActions(user, NOW);
    allTopicScopeProgress(user);
    const elapsed = performance.now() - started;
    expect(elapsed, `full engine pass took ${Math.round(elapsed)}ms`).toBeLessThan(4000);
  });
});
