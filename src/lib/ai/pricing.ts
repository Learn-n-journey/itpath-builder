/**
 * Model catalogue and cost estimates for the shared AI layer.
 *
 * Costs are estimates in Lovable credits per 1,000 tokens. They exist to make
 * spending visible and comparable between features, not to bill anyone: the
 * real figure is whatever the gateway reports on the workspace.
 *
 * This file is deliberately free of server-only imports so the internal
 * dashboard can render model names and tiers without pulling in server code.
 */

export type ModelTier = "cheap" | "capable";

export interface ModelSpec {
  id: string;
  tier: ModelTier;
  label: string;
  /** Estimated credits per 1,000 prompt tokens. */
  inputPer1k: number;
  /** Estimated credits per 1,000 completion tokens. */
  outputPer1k: number;
}

/** Cheapest capable-enough chat model: short, structured, verifiable work. */
export const CHEAP: ModelSpec = {
  id: "google/gemini-3.1-flash-lite",
  tier: "cheap",
  label: "Flash Lite",
  inputPer1k: 0.0008,
  outputPer1k: 0.0032,
};

/** Stronger model, used only when complexity or risk justifies the cost. */
export const CAPABLE: ModelSpec = {
  id: "google/gemini-3.8-flash",
  tier: "capable",
  label: "Flash",
  inputPer1k: 0.0025,
  outputPer1k: 0.01,
};

export const MODELS: ModelSpec[] = [CHEAP, CAPABLE];

export function modelSpec(id: string): ModelSpec {
  return MODELS.find((model) => model.id === id) ?? CHEAP;
}

/** Rough token count when the gateway does not report usage. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(modelId: string, promptTokens: number, completionTokens: number): number {
  const spec = modelSpec(modelId);
  return (promptTokens / 1000) * spec.inputPer1k + (completionTokens / 1000) * spec.outputPer1k;
}

export function formatCost(credits: number): string {
  if (credits <= 0) return "0";
  if (credits < 0.01) return credits.toFixed(4);
  return credits.toFixed(2);
}
