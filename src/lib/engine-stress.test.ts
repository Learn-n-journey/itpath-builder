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
import { currentJourneyTopic, isMastered, isTopicOpen, journeyTopics } from "@/lib/journey-order";

/** Deterministic PRNG so a failure can be reproduced from its seed. */
function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

const NOW = new Date("2026-06-01T12:00:00.000Z");

function dateNear(random: () => number, spreadDays: number): string {
  const offset = (random() * 2 - 1) * spreadDays * 86400000;
  return new Date(NOW.getTime() + offset).toISOString();
}

function pick<T>(random: () => number, list: T[]): T {
  return list[Math.floor(random() * list.length) % list.length] as T;
}

interface Shape {
  volume: number;
  hostile: boolean;
}

function buildUser(seed: number, shape: Shape): UserData {
  const random = rng(seed);
  const user = createDefaultUserData();
  const topicIds = topics.map((topic) => topic.id);
  const pool = shape.hostile
    ? [...topicIds, "topic-does-not-exist", "", "topic-␀-weird"]
    : topicIds;

  user.settings.experienceLevel = pick(random, ["none", "beginner", "some", "intermediate"]);
  user.settings.certificationTarget = shape.hostile && random() < 0.3
    ? "CompTIA Nonexistent+"
    : pick(random, ["CompTIA Tech+", "CompTIA A+", "CompTIA Network+", "CompTIA Security+"]);

  for (let index = 0; index < shape.volume; index += 1) {
    const topicId = pick(random, pool);
    const score = Math.round(random() * 100);
    const correct = random() > 0.4;
    const at = dateNear(random, shape.hostile ? 900 : 120);

    user.quizAttempts.push({
      id: `quiz-${seed}-${index}`,
      quizId: `quiz-${topicId}`,
      status: "submitted",
      questionOrder: [],
      choiceOrder: {},
      responses: {},
      results: [],
      score,
      total: 20,
      correct: Math.round(score / 5),
      incorrect: 20 - Math.round(score / 5),
      weakTopicIds: [topicId],
      mistakeCategories: [],
      recommendedTopicIds: [topicId],
      createdAt: at,
      submittedAt: at,
    } as UserData["quizAttempts"][number]);

    user.recallResponses.push({
      id: `recall-${seed}-${index}`,
      questionId: `recall-q-${index}`,
      topicId,
      answer: "answer",
      correct,
      matchedConcepts: [],
      createdAt: at,
    });

    user.practiceResponses.push({
      id: `practice-${seed}-${index}`,
      activityId: `practice-a-${index}`,
      topicId,
      selectedIndex: Math.floor(random() * 4),
      correct,
      createdAt: at,
    });

    user.masteryCheckAttempts.push({
      id: `mc-${seed}-${index}`,
      topicId,
      kind: pick(random, ["recall", "understanding", "application", "troubleshooting"]),
      score,
      correct: Math.round(score / 20),
      total: 5,
      itemIds: [],
      createdAt: at,
    } as UserData["masteryCheckAttempts"][number]);

    user.labAttempts.push({
      id: `lab-${seed}-${index}`,
      labId: `lab-${topicId}`,
      topicId,
      status: pick(random, ["in_progress", "completed", "needs_review", "mastered"]),
      checklist: {},
      reflection: "",
      score: Math.round(random() * 10),
      maxScore: 10,
      createdAt: at,
      updatedAt: at,
    } as UserData["labAttempts"][number]);

    user.mistakes.push({
      id: `mistake-${seed}-${index}`,
      topicId,
      activity: pick(random, ["quiz", "recall", "practice", "lab", "scenario"]),
      category: pick(random, ["didnt_know_fact", "misunderstood_concept", "rushed"]),
      severity: pick(random, ["low", "medium", "high"]),
      recommendedTopicIds: [topicId],
      recommendedSkillIds: [],
      createdAt: at,
      resolved: random() < 0.3,
    } as UserData["mistakes"][number]);

    user.reviews.push({
      id: `review-${seed}-${index}`,
      topicId,
      dueAt: dateNear(random, shape.hostile ? 900 : 60),
      interval: 7,
      intervalIndex: 2,
      status: pick(random, ["scheduled", "completed", "lapsed"]),
      successStreak: Math.floor(random() * 5),
      lapses: Math.floor(random() * 3),
      totalReviews: Math.floor(random() * 8),
      ease: 1,
      createdAt: at,
      updatedAt: at,
    } as UserData["reviews"][number]);

    user.topicProgress[topicId] = {
      id: `progress-${topicId}`,
      topicId,
      status: pick(random, ["not_started", "in_progress", "mastered"]),
      understanding: score,
      recall: score,
      application: score,
      practicalAbility: score,
      troubleshooting: score,
      retention: score,
      updatedAt: at,
    };

    if (random() < 0.4) {
      user.teachBackResponses[topicId] = {
        id: `teach-${topicId}`,
        topicId,
        body: shape.hostile && random() < 0.5 ? "" : "In my own words this works like ...",
        createdAt: at,
        updatedAt: at,
      };
    }
  }

  return user;
}

const FINITE = (value: unknown, label: string) => {
  expect(typeof value, label).toBe("number");
  expect(Number.isFinite(value as number), `${label} finite`).toBe(true);
};

const PERCENT = (value: number, label: string) => {
  FINITE(value, label);
  expect(value, `${label} >= 0`).toBeGreaterThanOrEqual(0);
  expect(value, `${label} <= 100`).toBeLessThanOrEqual(100);
};

const SHAPES: Array<[string, Shape]> = [
  ["empty", { volume: 0, hostile: false }],
  ["light", { volume: 3, hostile: false }],
  ["normal", { volume: 25, hostile: false }],
  ["heavy", { volume: 120, hostile: false }],
  ["hostile", { volume: 60, hostile: true }],
];

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
          expect(action.title.length).toBeGreaterThan(0);
          expect(action.to.startsWith("/")).toBe(true);
        }

        for (const topic of journeyTopics(user).slice(0, 12)) {
          const gate = masteryGate(user, topic.id, NOW);
          PERCENT(gate.score, `${topic.id} gate score`);
          for (const competency of gate.competencies) {
            PERCENT(competency.score, `${topic.id}/${competency.kind}`);
          }
          // The gate may only open when every present competency is proven.
          if (gate.mastered) {
            for (const competency of gate.competencies) {
              if (competency.present) expect(competency.met, `${topic.id} ${competency.kind}`).toBe(true);
            }
          }

          const scope = topicScopeProgress(user, topic.id);
          PERCENT(scope.overall, `${topic.id} scope`);
          for (const dimension of scope.dimensions) PERCENT(dimension.score, `${topic.id} ${dimension.key}`);
        }

        for (const readiness of scoreAllCertifications(user)) {
          PERCENT(readiness.overall, "certification overall");
        }

        const summary = summarizeMistakes(user);
        expect(summary.open).toBeLessThanOrEqual(summary.total);
      }
    });
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
