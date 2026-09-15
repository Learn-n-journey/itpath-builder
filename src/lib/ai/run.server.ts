/**
 * The shared AI layer.
 *
 * Every AI call in the app goes through `runAi`, which in one place applies:
 *  - in-flight de-duplication, exact caching and semantic cache matching
 *  - prompt and context compression
 *  - daily budgets and priority-aware gating
 *  - model routing, with automatic escalation when the cheap model falls short
 *  - cost tracking for the internal dashboard
 *
 * Nothing in here is specific to IT PATH: the feature names are a type away
 * from being reused by another app.
 */
import { GATEWAY_CHAT_URL } from "@/lib/ai-models";
import { allowAiCall, allowPriority, budgetKindFor } from "./budget.server";
import { cacheBucket, cacheKey, dedupe, readExact, readSemantic, writeCache } from "./cache.server";
import { buildPrompt } from "./compress.server";
import { estimateCost, estimateTokens, modelSpec, type ModelSpec } from "./pricing";
import { escalationModel, routeModel } from "./router.server";
import { recordAiEvent } from "./telemetry.server";
import type { AiFeature, AiOutcome, AiPriority, AiRisk } from "./types";

export interface RunAiInput {
  feature: AiFeature;
  userId?: string | undefined;
  system: string;
  /** User-side prompt. Already compressed by the caller where it matters. */
  prompt: string;
  risk: AiRisk;
  priority?: AiPriority;
  /** Ask the model for a single JSON object. */
  json?: boolean;
  /** 0-1 difficulty hint, usually from the Learning Intelligence Engine. */
  complexity?: number;
  requireCapable?: boolean;
  /** Skip the daily allowance check (used by internal second-pass calls). */
  skipBudget?: boolean;
  cache?: {
    /** Anything that makes this request unique. */
    parts: Array<string | undefined>;
    /** Shape of the request, used to group near-identical ones. */
    scope?: string;
    /** Allow a near-identical request to reuse this answer. */
    semantic?: boolean;
    threshold?: number;
  };
  /** Returns true when the answer is unusable and deserves a stronger model. */
  needsEscalation?: (text: string) => boolean;
}

export type RunAiResult =
  | {
      ok: true;
      text: string;
      model: string;
      outcome: AiOutcome;
      escalated: boolean;
      /** Set when the answer came from cache and cost nothing. */
      cached: boolean;
    }
  | { ok: false; error: string; outcome: AiOutcome; status?: number };

const ERROR_BY_STATUS: Record<number, string> = {
  429: "The AI service is busy right now — wait a moment and try again.",
  402: "AI usage limit reached for this app.",
  403: "AI access is currently blocked for this workspace.",
};

interface GatewayReply {
  text: string;
  promptTokens: number;
  completionTokens: number;
  status: number;
}

async function callGateway(
  model: ModelSpec,
  system: string,
  prompt: string,
  json: boolean,
  apiKey: string,
): Promise<GatewayReply | { error: number }> {
  const res = await fetch(GATEWAY_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model.id,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) return { error: res.status };

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  return {
    text,
    promptTokens: body.usage?.prompt_tokens ?? estimateTokens(system + prompt),
    completionTokens: body.usage?.completion_tokens ?? estimateTokens(text),
    status: res.status,
  };
}

export async function runAi(input: RunAiInput): Promise<RunAiResult> {
  const started = Date.now();
  const priority: AiPriority = input.priority ?? "interactive";
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return { ok: false, error: "AI service is not configured.", outcome: "error" };
  }

  const system = buildPrompt([input.system]);
  const prompt = buildPrompt([input.prompt]);
  const route = routeModel({
    feature: input.feature,
    risk: input.risk,
    promptChars: system.length + prompt.length,
    ...(input.complexity === undefined ? {} : { complexity: input.complexity }),
    ...(input.requireCapable === undefined ? {} : { requireCapable: input.requireCapable }),
  });

  // What this call would have cost, used to report cache savings.
  const wouldCost = estimateCost(
    route.model.id,
    estimateTokens(system + prompt),
    Math.max(200, estimateTokens(prompt) / 2),
  );

  const key = input.cache ? await cacheKey(input.feature, input.cache.parts) : null;
  const bucket =
    input.cache?.semantic && input.cache.scope
      ? await cacheBucket(input.feature, input.cache.scope)
      : null;

  const finish = async (
    result: RunAiResult,
    outcome: AiOutcome,
    extra: {
      model?: string;
      promptTokens?: number;
      completionTokens?: number;
      estCost?: number;
      savedCost?: number;
      escalated?: boolean;
    } = {},
  ): Promise<RunAiResult> => {
    await recordAiEvent({
      userId: input.userId,
      feature: input.feature,
      model: extra.model ?? route.model.id,
      outcome,
      risk: input.risk,
      priority,
      escalated: extra.escalated ?? false,
      promptTokens: extra.promptTokens ?? 0,
      completionTokens: extra.completionTokens ?? 0,
      estCost: extra.estCost ?? 0,
      savedCost: extra.savedCost ?? 0,
      durationMs: Date.now() - started,
    });
    return result;
  };

  // 1. Cached answers — exact first, then near-identical.
  if (key) {
    const exact = await readExact<string>(key);
    if (typeof exact === "string" && exact.length > 0) {
      return finish(
        { ok: true, text: exact, model: route.model.id, outcome: "cache_exact", escalated: false, cached: true },
        "cache_exact",
        { savedCost: wouldCost },
      );
    }
    if (bucket) {
      const near = await readSemantic<string>(bucket, prompt, input.cache?.threshold ?? 0.9);
      if (typeof near === "string" && near.length > 0) {
        return finish(
          { ok: true, text: near, model: route.model.id, outcome: "cache_semantic", escalated: false, cached: true },
          "cache_semantic",
          { savedCost: wouldCost },
        );
      }
    }
  }

  // 2. Budget and prioritisation.
  if (input.userId && !input.skipBudget) {
    const kind = budgetKindFor(input.feature);
    if (!(await allowPriority(input.userId, kind, priority))) {
      return finish(
        {
          ok: false,
          error: "This ran on the built-in path to protect today's AI allowance.",
          outcome: "priority_skipped",
        },
        "priority_skipped",
        { savedCost: wouldCost },
      );
    }
    const budget = await allowAiCall(input.userId, kind);
    if (!budget.ok) {
      return finish({ ok: false, error: budget.error, outcome: "budget_blocked" }, "budget_blocked", {
        savedCost: wouldCost,
      });
    }
  }

  // 3. The call itself, de-duplicated against identical work already running.
  const runKey = key ?? `${input.feature}:${system.length}:${prompt.slice(0, 200)}`;
  const { value, deduped } = await dedupe(runKey, async () => {
    let model = route.model;
    let escalated = false;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      let reply: GatewayReply | { error: number };
      try {
        reply = await callGateway(model, system, prompt, input.json ?? false, apiKey);
      } catch {
        return { failed: "Could not reach the AI service. Check your connection and try again.", status: 0 } as const;
      }
      if ("error" in reply) {
        return {
          failed: ERROR_BY_STATUS[reply.error] ?? `AI request failed (${reply.error}).`,
          status: reply.error,
        } as const;
      }

      const unusable = reply.text.length === 0 || (input.needsEscalation?.(reply.text) ?? false);
      const stronger = escalationModel(model);
      if (unusable && stronger && attempt === 0) {
        // Automatic escalation: the cheap model could not do this one.
        model = stronger;
        escalated = true;
        continue;
      }
      if (reply.text.length === 0) {
        return { failed: "The AI returned an empty reply. Try again.", status: 0 } as const;
      }
      return { reply, model, escalated } as const;
    }
    return { failed: "The AI returned an empty reply. Try again.", status: 0 } as const;
  });

  if ("failed" in value) {
    return finish({ ok: false, error: value.failed, outcome: "error", status: value.status }, "error");
  }

  const { reply, model, escalated } = value;
  const cost = estimateCost(model.id, reply.promptTokens, reply.completionTokens);

  if (key && reply.text.length > 0) {
    await writeCache({
      key,
      feature: input.feature,
      value: reply.text,
      ...(bucket ? { bucket, text: prompt } : {}),
      model: model.id,
    });
  }

  return finish(
    {
      ok: true,
      text: reply.text,
      model: model.id,
      outcome: deduped ? "deduped" : "live",
      escalated,
      cached: false,
    },
    deduped ? "deduped" : "live",
    {
      model: model.id,
      promptTokens: reply.promptTokens,
      completionTokens: reply.completionTokens,
      estCost: deduped ? 0 : cost,
      savedCost: deduped ? cost : 0,
      escalated,
    },
  );
}

/**
 * Request batching: several small jobs of the same shape answered in one call.
 * The items are numbered, and the model is asked for one JSON object keyed by
 * those numbers, so ten small extractions cost one request instead of ten.
 */
export async function runAiBatch(
  input: Omit<RunAiInput, "prompt" | "json"> & { items: string[]; instruction: string },
): Promise<Array<string | null>> {
  if (input.items.length === 0) return [];
  const numbered = input.items.map((item, index) => `### ${index + 1}\n${item}`).join("\n\n");
  const prompt = buildPrompt([
    input.instruction,
    `There are ${input.items.length} items. Answer every one.`,
    'Reply with one JSON object: {"1": "answer", "2": "answer", ...} and nothing else.',
    numbered,
  ]);

  const result = await runAi({ ...input, prompt, json: true });
  if (!result.ok) return input.items.map(() => null);

  try {
    const start = result.text.indexOf("{");
    const end = result.text.lastIndexOf("}");
    if (start === -1 || end === -1) return input.items.map(() => null);
    const parsed = JSON.parse(result.text.slice(start, end + 1)) as Record<string, unknown>;
    return input.items.map((_, index) => {
      const value = parsed[String(index + 1)];
      return typeof value === "string" ? value : null;
    });
  } catch {
    return input.items.map(() => null);
  }
}

export { modelSpec };
