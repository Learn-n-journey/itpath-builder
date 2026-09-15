/**
 * Model routing.
 *
 * The rule is simple: the cheapest model that can do the job, and a stronger
 * one only when the work is genuinely hard or getting it wrong would hurt.
 * Nothing here is guesswork by the model itself, the decision is made from
 * measurable properties of the request before a single token is spent.
 */
import { CAPABLE, CHEAP, type ModelSpec } from "./pricing";
import type { AiFeature, AiRisk } from "./types";

export interface RouteInput {
  feature: AiFeature;
  risk: AiRisk;
  /** Characters of prompt the model has to read. */
  promptChars: number;
  /**
   * 0-1 hint from the caller, usually taken from the deterministic Learning
   * Intelligence Engine (a weak, misconception-heavy concept is harder to
   * teach than a solid one).
   */
  complexity?: number;
  /** Forces the strong model regardless of the score. */
  requireCapable?: boolean;
}

export interface RouteDecision {
  model: ModelSpec;
  score: number;
  reason: string;
}

const RISK_WEIGHT: Record<AiRisk, number> = { low: 0, medium: 0.25, high: 0.6 };

/** Features whose output a learner acts on directly start higher. */
const FEATURE_WEIGHT: Record<AiFeature, number> = {
  tutor: 0.35,
  grading: 0.4,
  scenario: 0.05,
  knowledge: 0,
  self_check: 0,
};

export function routeModel(input: RouteInput): RouteDecision {
  if (input.requireCapable) {
    return { model: CAPABLE, score: 1, reason: "Caller required the stronger model." };
  }

  let score = RISK_WEIGHT[input.risk] + FEATURE_WEIGHT[input.feature];
  score += Math.min(input.complexity ?? 0, 1) * 0.3;
  // Very long prompts need a model that holds the thread across the whole input.
  if (input.promptChars > 12000) score += 0.2;
  else if (input.promptChars > 6000) score += 0.1;

  if (score >= 0.6) {
    return {
      model: CAPABLE,
      score,
      reason: `High-stakes or complex work (${score.toFixed(2)}).`,
    };
  }
  return { model: CHEAP, score, reason: `Routine work (${score.toFixed(2)}).` };
}

/** The model to retry with when the cheap one produced something unusable. */
export function escalationModel(current: ModelSpec): ModelSpec | null {
  return current.id === CHEAP.id ? CAPABLE : null;
}

/**
 * Selective self-checking. A second call doubles the cost, so it is spent only
 * where a wrong answer actually matters: high-risk output, or medium-risk
 * output that hands the learner commands to run.
 */
export function shouldSelfCheck(risk: AiRisk, output: string): boolean {
  if (risk === "high") return true;
  if (risk === "low") return false;
  const text = output.trim();
  if (text.length >= 400) return true;
  return /\b(sudo|ipconfig|ifconfig|netstat|systemctl|service|adb|nslookup|dig|chmod|chown|sfc|regedit|taskkill|Get-[A-Za-z]+|Set-[A-Za-z]+)\b|(^|\n)\s*\d+[.)]\s/i.test(text);
}
