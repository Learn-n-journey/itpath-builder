import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reviewTutorAnswer, shouldSelfCheckTutorAnswer } from "@/lib/ai-self-check.server";
import { allowAiCall } from "@/lib/ai-budget.server";
import { GATEWAY_CHAT_URL, TUTOR_MODEL } from "@/lib/ai-models";

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
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI service is not configured." };

    const budget = await allowAiCall(context.userId, "tutor");
    if (!budget.ok) return { ok: false, error: budget.error };

    const base =
      "You are an IT and cybersecurity tutor inside a study app. Follow the learner's task instructions exactly. Be concrete: real commands, real outputs, real examples. Structure replies with short headings, no padding. When the task says to ask one question at a time or to hold answers back, end your reply with the next question or prompt only. Correct wrong answers plainly instead of encouraging them. Write in plain text only: no markdown symbols such as **, ## or backticks. Use short headings on their own line and simple dashes for lists.";

    const sourcing = data.knowledge
      ? `\n\nThe learner has saved their own study material. Use it, and always label where an answer comes from using exactly these labels on their own line before the relevant part:\nYour material — when it comes from the saved material below.\nIT PATH — when it comes from the learner's course context in the task.\nGeneral knowledge — when it comes from your own knowledge.\nIf the saved material is wrong, outdated or conflicts with standard practice, say so plainly and give the correct version. If the saved material does not cover the question, say that before answering from general knowledge.\n\nSaved material:\n${data.knowledge}`
      : "";

    const system = base + sourcing;

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
