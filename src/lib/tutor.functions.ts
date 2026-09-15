import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reviewTutorAnswer } from "@/lib/ai-self-check.server";
import { compressContext } from "@/lib/ai/compress.server";
import { shouldSelfCheck } from "@/lib/ai/router.server";
import { runAi } from "@/lib/ai/run.server";

const inputSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20000) }))
    .min(1)
    .max(40),
  /** Digest of the learner's own saved material, from the Second Brain. */
  knowledge: z.string().max(30000).optional(),
});

export type TutorReply = { ok: true; answer: string } | { ok: false; error: string };

export const askTutor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<TutorReply> => {
    const question = [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Only the part of the learner's saved material that relates to the
    // question is sent — the rest is paid-for tokens with no effect.
    const knowledge = data.knowledge
      ? compressContext(data.knowledge, question, 8000)
      : undefined;

    const base =
      "You are an IT and cybersecurity tutor inside a study app. Follow the learner's task instructions exactly. Be concrete: real commands, real outputs, real examples. Structure replies with short headings, no padding. When the task says to ask one question at a time or to hold answers back, end your reply with the next question or prompt only. Correct wrong answers plainly instead of encouraging them. Write in plain text only: no markdown symbols such as **, ## or backticks. Use short headings on their own line and simple dashes for lists.";

    const sourcing = knowledge
      ? `\n\nThe learner has saved their own study material. Use it, and always label where an answer comes from using exactly these labels on their own line before the relevant part:\nYour material — when it comes from the saved material below.\nIT PATH — when it comes from the learner's course context in the task.\nGeneral knowledge — when it comes from your own knowledge.\nIf the saved material is wrong, outdated or conflicts with standard practice, say so plainly and give the correct version. If the saved material does not cover the question, say that before answering from general knowledge.\n\nSaved material:\n${knowledge}`
      : "";

    const system = base + sourcing;

    // A plain opening question with no personal material behind it is the same
    // question thousands of learners ask, so it is cached and matched loosely.
    const reusable = data.messages.length === 1 && !knowledge;

    const result = await runAi({
      feature: "tutor",
      userId: context.userId,
      system,
      prompt: question,
      messages: data.messages,
      risk: "medium",
      priority: "interactive",
      ...(reusable
        ? { cache: { parts: [question], scope: "tutor-open-question", semantic: true, threshold: 0.92 } }
        : {}),
    });

    if (!result.ok) return { ok: false, error: result.error };
    const answer = result.text;

    // Selective self-check: a second pass only where being wrong would matter.
    if (!result.cached && shouldSelfCheck("medium", answer)) {
      const checked = await reviewTutorAnswer({
        question,
        answer,
        knowledge,
        userId: context.userId,
      });
      return { ok: true, answer: checked };
    }
    return { ok: true, answer };
  });

/* eslint-disable no-unreachable */
function unusedLegacyTutorPath() {
  const data = null as never;
  const apiKey = "" as string;
  const system = "" as string;
  const context = null as never;
  {
    try {
      const res = await fetch(GATEWAY_CHAT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: TUTOR_MODEL,
          messages: [{ role: "system", content: system }, ...data.messages],
        }),
      });

      if (res.status === 429) return { ok: false, error: "Too many requests right now — wait a moment and try again." };
      if (res.status === 402) return { ok: false, error: "AI usage limit reached for this app." };
      if (!res.ok) return { ok: false, error: `AI request failed (${res.status}).` };

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const answer = json.choices?.[0]?.message?.content?.trim();
      if (!answer) return { ok: false, error: "The tutor returned an empty reply. Try again." };

      // Silent self-check: only for substantial or command-bearing answers.
      if (shouldSelfCheckTutorAnswer(answer)) {
        const question = [...data.messages].reverse().find((m) => m.role === "user")?.content ?? "";
        const checked = await reviewTutorAnswer({ question, answer, knowledge: data.knowledge });
        return { ok: true, answer: checked };
      }
      return { ok: true, answer };
    } catch {
      return { ok: false, error: "Could not reach the AI service. Check your connection and try again." };
    }
  });
