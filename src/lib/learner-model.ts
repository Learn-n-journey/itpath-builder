/**
 * Learner Intelligence Engine.
 *
 * Maintains one profile per concept (curriculum topic) from the learner's real
 * interaction history: mastery probability, confidence, retention, exposure,
 * attempts and accuracy, response time, error patterns, prerequisite state and
 * learning velocity. The profile is rebuilt from the evidence stream, so it is
 * current after every lesson, question, quiz, review and AI interaction.
 *
 * Nothing is assumed: a concept with no evidence stays at zero mastery with
 * zero confidence, and is reported as untouched rather than weak.
 */
import { topics } from "@/data/static-content";
import { adaptivePath } from "@/lib/adaptive-path";
import { certificationTopics } from "@/lib/cert-path";
import { evidenceStream } from "@/lib/learner-signals";
import type {
  EntityId,
  LearnerSignal,
  LearnerSignalKind,
  UserData,
} from "@/lib/app-data/types";
import { topicScopeProgress } from "@/lib/scope-progress";

const MS_DAY = 24 * 60 * 60 * 1000;

/** How much each kind of evidence says about real mastery. */
const KIND_WEIGHT: Record<LearnerSignalKind, number> = {
  lesson: 0.15,
  recall: 0.9,
  practice: 0.8,
  quiz: 1,
  teach_back: 0.7,
  scenario: 0.9,
  lab: 1,
  review: 1.1,
  troubleshoot: 1,
  career: 0.8,
  assignment: 0.8,
  ai_grading: 1,
  ai_tutor: 0.2,
  knowledge: 0.1,
  terminal: 1,
};

export type ConceptAction = "learn" | "practice" | "review" | "test" | "maintain";
export type ConceptTrend = "improving" | "steady" | "slipping" | "unknown";

export interface PrerequisiteState {
  topicId: EntityId;
  title: string;
  mastery: number;
  satisfied: boolean;
}

export interface ErrorPattern {
  /** Human-readable misconception or error label. */
  label: string;
  count: number;
}

export interface ConceptProfile {
  topicId: EntityId;
  title: string;
  certificationId: EntityId;
  /**
   * 0-1 probability the learner knows this concept right now, after the raw
   * evidence has been adjusted for forgetting, repeated errors and unproven
   * prerequisites. Unattempted work counts as zero, never as mastered.
   */
  mastery: number;
  /** Raw full-scope evidence score before those adjustments, 0-1. */
  evidenceMastery: number;
  /** Share of the topic's available activities that has been attempted, 0-1. */
  coverage: number;
  /** True once mastery is high enough to call the concept demonstrated. */
  proven: boolean;
  /** 0-1 confidence in the mastery number, from how much evidence exists. */
  confidence: number;
  /** 0-1 probability the concept is still retrievable today. */
  retention: number;
  /** 0-1 probability it has been forgotten since the last exposure. */
  forgetting: number;
  lastExposureAt: string | null;
  daysSinceExposure: number | null;
  attempts: number;
  correct: number;
  accuracy: number;
  /** Mean answer time in seconds, when any interaction was timed. */
  avgResponseSeconds: number | null;
  errorPatterns: ErrorPattern[];
  prerequisites: PrerequisiteState[];
  /** Blocked when a prerequisite is clearly unproven and this concept is untouched. */
  blocked: boolean;
  /** Mastery points gained per week over the recent window. */
  velocity: number;
  trend: ConceptTrend;
  action: ConceptAction;
  reason: string;
  /** Ranking score: higher means study this sooner. */
  priority: number;
}

export interface LearnerModel {
  generatedAt: string;
  profiles: ConceptProfile[];
  byTopic: Record<EntityId, ConceptProfile>;
  totalSignals: number;
  /** Concepts with any evidence at all. */
  studied: number;
  /** Mean mastery across every available concept, unattempted ones included. */
  averageMastery: number;
  /** The certification path the learner is working towards. */
  pathCertificationId: EntityId;
  pathCertificationTitle: string;
  /** Number of concepts in that path. */
  pathTopics: number;
  /** Mean mastery across every concept in the path, unattempted counted as zero. */
  pathMastery: number;
  /** Share of the path's available activities attempted so far, 0-1. */
  pathCoverage: number;
  /** Concepts in the path with demonstrated mastery. */
  pathProven: number;
  /** Concepts in the path still unproven (weak or never attempted). */
  pathUnproven: number;
  studyNext: ConceptProfile[];
  reviewNext: ConceptProfile[];
  testNext: ConceptProfile[];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Outcome of one signal as a 0-1 quality value, or null when it was not graded. */
function outcomeOf(signal: LearnerSignal): number | null {
  if (typeof signal.score === "number") return clamp01(signal.score);
  if (typeof signal.correct === "boolean") return signal.correct ? 1 : 0;
  return null;
}

/**
 * Recency-weighted mastery. Recent evidence dominates, older evidence still
 * counts, and a single lucky answer cannot reach certainty because the weight
 * of evidence is capped into the confidence term instead.
 */
function masteryFrom(signals: LearnerSignal[], nowMs: number): { mastery: number; weight: number } {
  let weighted = 0;
  let weight = 0;
  for (const signal of signals) {
    const outcome = outcomeOf(signal);
    if (outcome === null) continue;
    const ageDays = Math.max(0, (nowMs - new Date(signal.at).getTime()) / MS_DAY);
    const recency = Math.exp(-ageDays / 45);
    const w = (KIND_WEIGHT[signal.kind] ?? 0.5) * (0.35 + 0.65 * recency);
    weighted += outcome * w;
    weight += w;
  }
  if (weight === 0) return { mastery: 0, weight: 0 };
  // Beta-style prior pulls small samples toward 0.5 instead of 0 or 1.
  const priorWeight = 1.5;
  const mastery = (weighted + priorWeight * 0.35) / (weight + priorWeight);
  return { mastery: clamp01(mastery), weight };
}

/** Mastery at or above this counts as demonstrated rather than assumed. */
export const PROVEN_MASTERY = 0.7;

/**
 * Evidence raises mastery; forgetting, repeated errors and unproven
 * prerequisites lower it. Nothing here can raise an unattempted concept above
 * zero — unknown stays unknown.
 */
function adjustMastery(
  profile: ConceptProfile,
  prerequisites: PrerequisiteState[],
): number {
  if (profile.evidenceMastery <= 0) return 0;

  // Forgetting: recall that has decayed since the last exposure discounts the
  // evidence, but never wipes it out.
  const decay = profile.daysSinceExposure === null
    ? 1
    : 0.85 + 0.15 * retentionFrom(profile.evidenceMastery, profile.attempts, profile.daysSinceExposure);

  // Repeated unresolved errors on the concept.
  const errorCount = profile.errorPatterns.reduce((sum, pattern) => sum + pattern.count, 0);
  const errors = 1 - Math.min(errorCount, 6) * 0.03;

  // Unproven prerequisites: knowledge resting on unproven ground is less certain.
  const gaps = prerequisites.filter((prerequisite) => !prerequisite.satisfied).length;
  const foundation = 1 - Math.min(gaps, 3) * 0.08;

  // Thin coverage keeps a perfect run on one activity from reading as mastery.
  const proof = 0.6 + 0.4 * profile.coverage;

  return clamp01(profile.evidenceMastery * decay * errors * foundation * proof);
}

/** Half-life grows with mastery and with how often the concept has been revisited. */
function retentionFrom(mastery: number, exposures: number, daysSince: number | null): number {
  if (daysSince === null) return 0;
  const halfLife = 1.5 + mastery * 18 + Math.min(exposures, 12) * 1.5;
  return clamp01(Math.pow(0.5, daysSince / halfLife));
}

const CAUSE_LABELS: Record<string, string> = {
  didnt_know_fact: "Missing facts",
  misunderstood_concept: "Concept misunderstood",
  misread_question: "Misread the question",
  rushed: "Answered too fast",
  confused_concepts: "Confusing two concepts",
  scenario_recognition_failure: "Not recognising the scenario",
  command_knowledge_gap: "Command knowledge gap",
  reasoning_error: "Reasoning error",
  prerequisite_gap: "Prerequisite gap",
};

function errorPatternsFor(user: UserData, topicId: EntityId, signals: LearnerSignal[]): ErrorPattern[] {
  const counts = new Map<string, number>();
  for (const mistake of user.mistakes) {
    if (mistake.topicId !== topicId || mistake.resolved) continue;
    const label = CAUSE_LABELS[mistake.category] ?? mistake.category;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  for (const signal of signals) {
    if (!signal.errorTag) continue;
    const label = CAUSE_LABELS[signal.errorTag] ?? signal.errorTag;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

/** Mastery gained per week, from the difference between older and newer evidence. */
function velocityFrom(signals: LearnerSignal[], nowMs: number): { velocity: number; trend: ConceptTrend } {
  const graded = signals
    .filter((signal) => outcomeOf(signal) !== null)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  if (graded.length < 4) return { velocity: 0, trend: "unknown" };

  const half = Math.floor(graded.length / 2);
  const older = mean(graded.slice(0, half).map((s) => outcomeOf(s) ?? 0));
  const newer = mean(graded.slice(half).map((s) => outcomeOf(s) ?? 0));
  const firstNew = new Date(graded[half]!.at).getTime();
  const spanDays = Math.max(1, (nowMs - firstNew) / MS_DAY);
  const velocity = ((newer - older) / spanDays) * 7;
  const delta = newer - older;
  const trend: ConceptTrend = delta > 0.08 ? "improving" : delta < -0.08 ? "slipping" : "steady";
  return { velocity, trend };
}

function decide(
  profile: Omit<ConceptProfile, "action" | "reason" | "priority">,
): { action: ConceptAction; reason: string; priority: number } {
  const { mastery, confidence, retention, attempts, blocked, errorPatterns, daysSinceExposure } = profile;

  if (blocked) {
    const gap = profile.prerequisites.find((p) => !p.satisfied);
    return {
      action: "learn",
      reason: `Build ${gap ? gap.title : "the prerequisite"} first — it underpins this concept.`,
      priority: 55,
    };
  }

  if (attempts === 0) {
    return {
      action: "learn",
      reason: "No recorded work yet. Start with the lesson.",
      priority: 40,
    };
  }

  if (mastery < 0.5) {
    const pattern = errorPatterns[0];
    return {
      action: "practice",
      reason: pattern
        ? `${Math.round(mastery * 100)}% mastery, repeated issue: ${pattern.label.toLowerCase()}.`
        : `${Math.round(mastery * 100)}% mastery across ${attempts} graded answers.`,
      priority: 90 - mastery * 40,
    };
  }

  if (retention < 0.55 && daysSinceExposure !== null) {
    return {
      action: "review",
      reason: `Last worked ${Math.round(daysSinceExposure)} days ago — recall is fading.`,
      priority: 70 + (1 - retention) * 20,
    };
  }

  if (confidence < 0.5) {
    return {
      action: "test",
      reason: `Looks solid but only ${attempts} graded answers so far. Prove it under test conditions.`,
      priority: 50 + (1 - confidence) * 15,
    };
  }

  if (mastery >= 0.85 && retention >= 0.7) {
    return {
      action: "maintain",
      reason: "Strong and recent. Keep it on spaced review only.",
      priority: 10,
    };
  }

  return {
    action: "test",
    reason: `${Math.round(mastery * 100)}% mastery. A timed check confirms it.`,
    priority: 45,
  };
}

export function buildLearnerModel(user: UserData, now: Date = new Date()): LearnerModel {
  const nowMs = now.getTime();
  const stream = evidenceStream(user);

  const byTopicSignals = new Map<EntityId, LearnerSignal[]>();
  for (const signal of stream) {
    const list = byTopicSignals.get(signal.topicId);
    if (list) list.push(signal);
    else byTopicSignals.set(signal.topicId, [signal]);
  }

  // First pass: the numbers that do not depend on other concepts.
  const base = new Map<EntityId, ConceptProfile>();
  const scopeByTopic = new Map<EntityId, ReturnType<typeof topicScopeProgress>>();
  for (const topic of topics) {
    const signals = byTopicSignals.get(topic.id) ?? [];
    const graded = signals.filter((signal) => outcomeOf(signal) !== null);
    const scope = topicScopeProgress(user, topic.id);
    scopeByTopic.set(topic.id, scope);
    const mastery = scope.overall / 100;
    const coverage = scope.available === 0 ? 0 : clamp01(scope.attempted / scope.available);
    const lastExposureAt = signals.length > 0 ? signals[0]!.at : null;
    const daysSinceExposure =
      lastExposureAt === null ? null : (nowMs - new Date(lastExposureAt).getTime()) / MS_DAY;
    const retention = scope.retention.score / 100;
    const timed = signals.filter((signal) => typeof signal.elapsedMs === "number");
    const correct = graded.filter((signal) => (outcomeOf(signal) ?? 0) >= 0.7).length;
    const { velocity, trend } = velocityFrom(signals, nowMs);

    base.set(topic.id, {
      topicId: topic.id,
      title: topic.title,
      certificationId: topic.certificationId,
      mastery,
      evidenceMastery: mastery,
      coverage,
      proven: mastery >= PROVEN_MASTERY,
      confidence: coverage,
      retention,
      forgetting: lastExposureAt === null ? 0 : 1 - retention,
      lastExposureAt,
      daysSinceExposure,
      attempts: graded.length,
      correct,
      accuracy: graded.length === 0 ? 0 : correct / graded.length,
      avgResponseSeconds:
        timed.length === 0
          ? null
          : Math.round(mean(timed.map((signal) => (signal.elapsedMs ?? 0) / 1000))),
      errorPatterns: errorPatternsFor(user, topic.id, signals),
      prerequisites: [],
      blocked: false,
      velocity,
      trend,
      action: "learn",
      reason: "",
      priority: 0,
    });
  }

  // Second pass: prerequisite relationships and the resulting recommendation.
  const profiles: ConceptProfile[] = [];
  for (const topic of topics) {
    const profile = base.get(topic.id)!;
    const prerequisites: PrerequisiteState[] = topic.prerequisiteTopicIds
      .map((id) => base.get(id))
      .filter((p): p is ConceptProfile => Boolean(p))
      .map((p) => ({
        topicId: p.topicId,
        title: p.title,
        mastery: p.mastery,
        satisfied: p.attempts > 0 && p.mastery >= 0.5,
      }));
    const blocked =
      profile.attempts === 0 && prerequisites.some((p) => !p.satisfied && p.mastery < 0.5);
    const mastery = adjustMastery(profile, prerequisites);
    const withLinks = {
      ...profile,
      prerequisites,
      blocked,
      mastery,
      proven: mastery >= PROVEN_MASTERY,
    };
    const decision = decide(withLinks);
    profiles.push({ ...withLinks, ...decision });
  }

  profiles.sort((a, b) => b.priority - a.priority);
  const studiedProfiles = profiles.filter((profile) => profile.attempts > 0);

  const path = adaptivePath(user);
  const pathIds = new Set(certificationTopics(path.certification.id).map((topic) => topic.id));
  const pathProfiles = profiles.filter((profile) => pathIds.has(profile.topicId));
  const pathScope = [...pathIds].map((id) => scopeByTopic.get(id)).filter(Boolean) as Array<
    ReturnType<typeof topicScopeProgress>
  >;
  const pathAvailable = pathScope.reduce((sum, scope) => sum + scope.available, 0);
  const pathAttempted = pathScope.reduce((sum, scope) => sum + scope.attempted, 0);

  return {
    generatedAt: now.toISOString(),
    profiles,
    byTopic: Object.fromEntries(profiles.map((profile) => [profile.topicId, profile])),
    totalSignals: stream.length,
    studied: studiedProfiles.length,
    averageMastery: mean(profiles.map((profile) => profile.mastery)),
    pathCertificationId: path.certification.id,
    pathCertificationTitle: path.certification.title,
    pathTopics: pathProfiles.length,
    pathMastery: mean(pathProfiles.map((profile) => profile.mastery)),
    pathCoverage: pathAvailable === 0 ? 0 : clamp01(pathAttempted / pathAvailable),
    pathProven: pathProfiles.filter((profile) => profile.proven).length,
    pathUnproven: pathProfiles.filter((profile) => !profile.proven).length,
    studyNext: profiles.filter((p) => p.action === "learn" || p.action === "practice").slice(0, 5),
    reviewNext: profiles.filter((p) => p.action === "review").slice(0, 5),
    testNext: profiles.filter((p) => p.action === "test").slice(0, 5),
  };
}

/** Concepts the engine wants worked on next, in order, across all actions. */
export function learnerPriorities(model: LearnerModel, limit = 6): ConceptProfile[] {
  return model.profiles.filter((profile) => profile.action !== "maintain").slice(0, limit);
}
