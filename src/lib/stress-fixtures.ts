/**
 * Shared fixtures for the engine stress tests.
 *
 * Builds randomised but reproducible learner histories, including hostile ones
 * (unknown topic ids, empty strings, far future and far past timestamps), so
 * every engine can be pushed against the same material.
 */
import { expect } from "vitest";

import { createDefaultUserData } from "@/lib/app-data/defaults";
import type { UserData } from "@/lib/app-data/types";
import { topics } from "@/data/static-content";

/** Deterministic PRNG so a failure can be reproduced from its seed. */
export function rng(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

export const NOW = new Date("2026-06-01T12:00:00.000Z");

export function dateNear(random: () => number, spreadDays: number): string {
  const offset = (random() * 2 - 1) * spreadDays * 86400000;
  return new Date(NOW.getTime() + offset).toISOString();
}

export function pick<T>(random: () => number, list: T[]): T {
  return list[Math.floor(random() * list.length) % list.length] as T;
}

export interface Shape {
  volume: number;
  hostile: boolean;
}

export function buildUser(seed: number, shape: Shape): UserData {
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
      updatedAt: at,
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

/**
 * The same history with the extra records the session engines read: logged
 * study time, review attempts and notes.
 */
export function buildRichUser(seed: number, shape: Shape): UserData {
  const user = buildUser(seed, shape);
  const random = rng(seed + 17);
  const topicIds = topics.map((topic) => topic.id);
  const pool = shape.hostile ? [...topicIds, "topic-does-not-exist", ""] : topicIds;

  for (let index = 0; index < shape.volume; index += 1) {
    const topicId = pick(random, pool);
    const at = dateNear(random, shape.hostile ? 900 : 60);

    user.studySessions.push({
      id: `session-${seed}-${index}`,
      topicId,
      startedAt: at,
      minutes: shape.hostile && random() < 0.2 ? 0 : Math.round(random() * 120),
    });

    user.reviewAttempts.push({
      id: `review-attempt-${seed}-${index}`,
      reviewId: `review-${seed}-${index}`,
      topicId,
      outcome: pick(random, ["pass", "fail"] as const),
      intervalBefore: 3,
      intervalAfter: 7,
      dueBefore: at,
      dueAfter: dateNear(random, 30),
      wasOverdue: random() < 0.5,
      createdAt: at,
    });

    if (random() < 0.3) {
      user.notes.push({
        id: `note-${seed}-${index}`,
        topicId,
        body: shape.hostile && random() < 0.5 ? "" : "A note in my own words.",
        createdAt: at,
        updatedAt: at,
      } as UserData["notes"][number]);
    }
  }

  return user;
}

export const FINITE = (value: unknown, label: string) => {
  expect(typeof value, label).toBe("number");
  expect(Number.isFinite(value as number), `${label} finite`).toBe(true);
};

export const PERCENT = (value: number, label: string) => {
  FINITE(value, label);
  expect(value, `${label} >= 0`).toBeGreaterThanOrEqual(0);
  expect(value, `${label} <= 100`).toBeLessThanOrEqual(100);
};

/** No engine may ever hand the learner a broken or judgmental sentence. */
export const CLEAN_TEXT = (value: string, label: string) => {
  expect(typeof value, label).toBe("string");
  expect(value.includes("NaN"), `${label} has NaN`).toBe(false);
  expect(value.includes("undefined"), `${label} has undefined`).toBe(false);
  expect(value.includes("[object Object]"), `${label} has raw object`).toBe(false);
  expect(value.toLowerCase().includes("failed"), `${label} says failed`).toBe(false);
};

export const SHAPES: Array<[string, Shape]> = [
  ["empty", { volume: 0, hostile: false }],
  ["light", { volume: 3, hostile: false }],
  ["normal", { volume: 25, hostile: false }],
  ["heavy", { volume: 120, hostile: false }],
  ["hostile", { volume: 60, hostile: true }],
];
