import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  prompt: z.string().min(20).max(20000),
  interactive: z.boolean(),
});

export type TutorReply = { ok: true; answer: string } | { ok: false; error: string };

export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<TutorReply> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI service is not configured." };

    const system = data.interactive
      ? "You are an IT and cybersecurity tutor inside a study app. Follow the learner's task instructions exactly. Keep the reply focused and structured with short headings. When the task says to ask one question at a time, end your reply with the first question only."
      : "You are an IT and cybersecurity tutor inside a study app. Follow the learner's task instructions exactly. Be concrete: real commands, real outputs, real examples. Structured with short headings. Do not pad.";

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: data.prompt },
          ],
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
      return { ok: true, answer };
    } catch {
      return { ok: false, error: "Could not reach the AI service. Check your connection and try again." };
    }
  });
