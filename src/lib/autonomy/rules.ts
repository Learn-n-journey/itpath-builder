import type { AutonomyThresholds } from "./types";

/** Versioned and domain-neutral. Package rules may add stricter checks, never bypass these. */
export const DEFAULT_AUTONOMY_THRESHOLDS: AutonomyThresholds = Object.freeze({
  version: "autonomy-rules@1.0.0",
  minimumGradedEvidence: 3,
  minimumMonitoringEvidence: 20,
  weakMastery: 0.6,
  weakRetention: 0.55,
  repeatedFailureCount: 2,
  repeatedMisconceptionCount: 2,
  prerequisiteMastery: 0.6,
  acceptableAssessmentAccuracy: 0.7,
  masteryTarget: 0.8,
  maximumHealthDegradation: 0.08,
  maximumFailureRateIncrease: 0.1,
});

export const AUTONOMY_RULES = Object.freeze({
  weakMastery: "autonomy.health.weak-mastery",
  weakRetention: "autonomy.health.weak-retention",
  repeatedFailure: "autonomy.health.repeated-failure",
  repeatedMisconception: "autonomy.health.repeated-misconception",
  prerequisiteWeakness: "autonomy.prerequisite.weak",
  assessmentAccuracy: "autonomy.assessment.low-accuracy",
  assessmentSize: "autonomy.assessment.exact-size",
  regression: "autonomy.promotion.regression",
  degradation: "autonomy.monitor.degradation",
} as const);