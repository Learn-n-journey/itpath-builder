import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface TutorChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorThreadSummary {
  id: string;
  title: string;
  mode: string | null;
  topicId: string | null;
  messageCount: number;
  updatedAt: string;
}

export interface TutorThread extends TutorThreadSummary {
  messages: TutorChatMessage[];
}

type ListReply = { ok: true; threads: TutorThreadSummary[] } | { ok: false; error: string };
type ThreadReply = { ok: true; thread: TutorThread } | { ok: false; error: string };
type SaveReply = { ok: true; id: string } | { ok: false; error: string };
type OkReply = { ok: true } | { ok: false; error: string };

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface ThreadRow {
  id: string;
  title: string;
  mode: string | null;
  topic_id: string | null;
  messages: unknown;
  updated_at: string;
}

function toSummary(row: ThreadRow): TutorThreadSummary {
  return {
    id: row.id,
    title: row.title,
    mode: row.mode,
    topicId: row.topic_id,
    messageCount: Array.isArray(row.messages) ? row.messages.length : 0,
    updatedAt: row.updated_at,
  };
}

function toThread(row: ThreadRow): TutorThread {
  return {
    ...toSummary(row),
    messages: (Array.isArray(row.messages) ? row.messages : []) as TutorChatMessage[],
  };
}

/** Removes conversations older than 30 days, then returns the rest. */
async function purgeExpired(supabase: {
  from: (t: string) => any;
}, userId: string) {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  await supabase.from("tutor_threads").delete().eq("user_id", userId).lt("updated_at", cutoff);
}

export const listTutorThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ListReply> => {
    await purgeExpired(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("tutor_threads")
      .select("id, title, mode, topic_id, messages, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false, error: error.message };
    return { ok: true, threads: ((data ?? []) as ThreadRow[]).map(toSummary) };
  });

export const getTutorThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }): Promise<ThreadReply> => {
    const { data: row, error } = await context.supabase
      .from("tutor_threads")
      .select("id, title, mode, topic_id, messages, updated_at")
      .eq("user_id", context.userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!row) return { ok: false, error: "That conversation is no longer saved." };
    return { ok: true, thread: toThread(row as ThreadRow) };
  });

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(20000),
});

export const saveTutorThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        id: z.string().optional(),
        title: z.string().min(1).max(120),
        mode: z.string().optional(),
        topicId: z.string().optional(),
        messages: z.array(messageSchema).min(1).max(200),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<SaveReply> => {
    const payload = {
      user_id: context.userId,
      title: data.title,
      mode: data.mode ?? null,
      topic_id: data.topicId ?? null,
      messages: data.messages,
    };
    const query = data.id
      ? context.supabase
          .from("tutor_threads")
          .update(payload)
          .eq("id", data.id)
          .eq("user_id", context.userId)
          .select("id")
          .maybeSingle()
      : context.supabase.from("tutor_threads").insert(payload).select("id").single();
    const { data: row, error } = await query;
    if (error) return { ok: false, error: error.message };
    if (!row) return { ok: false, error: "Could not save the conversation." };
    return { ok: true, id: row.id as string };
  });

export const deleteTutorThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }): Promise<OkReply> => {
    const { error } = await context.supabase
      .from("tutor_threads")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export const clearTutorThreads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OkReply> => {
    const { error } = await context.supabase
      .from("tutor_threads")
      .delete()
      .eq("user_id", context.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
