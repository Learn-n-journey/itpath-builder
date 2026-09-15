/**
 * Shared vocabulary for the AI layer. Client-safe: the internal dashboard and
 * the server both import these names.
 */

/** Every part of the app that is allowed to spend AI credits. */
export type AiFeature = "tutor" | "grading" | "scenario" | "knowledge" | "self_check";

export const FEATURE_LABEL: Record<AiFeature, string> = {
  tutor: "AI Tutor",
  grading: "AI marking",
  scenario: "Scenario writing",
  knowledge: "Second Brain",
  self_check: "Self-checks",
};

/**
 * What a wrong answer costs the learner.
 *  - low: cosmetic or easily re-run work (scenario drafts, extraction).
 *  - medium: teaching content the learner reads and believes.
 *  - high: anything that changes their recorded progress or gives instructions
 *    they will run on a real machine.
 */
export type AiRisk = "low" | "medium" | "high";

/**
 * How much the call deserves to survive a tight budget.
 *  - interactive: a person is waiting for it.
 *  - background: useful, can wait or be skipped today.
 *  - optional: nice to have; first thing dropped when the budget is tight.
 */
export type AiPriority = "interactive" | "background" | "optional";

/** How an answer was produced, for cost reporting. */
export type AiOutcome =
  | "live"
  | "cache_exact"
  | "cache_semantic"
  | "deduped"
  | "budget_blocked"
  | "priority_skipped"
  | "error";

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
}
