import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20000) })).min(1).max(40),
  knowledge: z.string().max(30000).optional(),
});

export type TutorReply = { ok: true; answer: string } | { ok: false; error: string };

export const askTutor = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<TutorReply> => {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI service is not configured." };
    const base = "You are an IT and cybersecurity tutor inside a study app. Follow the learner's task instructions exactly. Be concrete: real commands, real outputs, real examples. Structure replies with short headings, no padding. When the task says to ask one question at a time or to hold answers back, end your reply with the next question or prompt only. Correct wrong answers plainly instead of encouraging them. Write in plain text only: no markdown symbols such as **, ## or backticks. Use short headings on their own line and simple dashes for lists.";
    const sourcing = data.knowledge ? `\n\nThe learner has saved their own study material. Use it, and always label where an answer comes from using exactly these labels on their own line before the relevant part:\nYour material — when it comes from the saved material below.\nIT PATH — when it comes from the learner's course context in the task.\nGeneral knowledge — when it comes from your own knowledge.\nIf the saved material is wrong, outdated or conflicts with standard practice, say so plainly and give the correct version. If the saved material does not cover the question, say that before answering from general knowledge.\n\nSaved material:\n${data.knowledge}` : "";
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env["OPENAI_MODEL"] || "gpt-5-mini", messages: [{ role: "system", content: base + sourcing }, ...data.messages] }),
      });
      if (res.status === 429) return { ok: false, error: "Too many requests right now — wait a moment and try again." };
      if (!res.ok) return { ok: false, error: `AI request failed (${res.status}).` };
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const answer = json.choices?.[0]?.message?.content?.trim();
      if (!answer) return { ok: false, error: "The tutor returned an empty reply. Try again." };
      return { ok: true, answer };
    } catch { return { ok: false, error: "Could not reach the AI service. Check your connection and try again." }; }
  });
