/**
 * Creating and managing learning paths. Owner only.
 *
 * Reading them is a plain table read from the browser (row level security only
 * shows a hidden path to the owner); writing goes through these functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { learningPathFromRow, pathFolder, pathSlug, type LearningPath } from "@/lib/learning-paths-shared";

export type LearningPathReply =
  | { ok: true; paths: LearningPath[] }
  | { ok: false; error: string };

function isOwner(email: string | undefined | null) {
  return OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
}

async function allPaths(): Promise<LearningPath[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("learning_paths")
    .select("slug, name, folder, topics, visible")
    .order("created_at", { ascending: true });
  return (data ?? []).map(learningPathFromRow);
}

/** Create a fresh path: a folder name, a list of sections, nothing else. */
export const createLearningPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        name: z.string().trim().min(2).max(40),
        topics: z.array(z.string().trim().min(2).max(120)).min(1).max(400),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<LearningPathReply> => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!isOwner(email)) return { ok: false, error: "Not allowed." };

    const slug = pathSlug(data.name);
    if (!slug) return { ok: false, error: "That name cannot be turned into a folder name." };
    if (slug === "it-cybersecurity" || slug === "auto-repair" || slug === "it" || slug === "auto") {
      return { ok: false, error: "That name is already used by a built-in course." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("learning_paths").insert({
      slug,
      name: data.name.trim(),
      folder: pathFolder(data.name),
      topics: data.topics.map((topic) => topic.trim()).filter(Boolean),
      visible: false,
    });
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "A path with that name already exists." : error.message,
      };
    }
    return { ok: true, paths: await allPaths() };
  });

/** Show a path to everyone, or put it back to owner-only. */
export const setLearningPathVisible = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z.object({ slug: z.string().trim().min(1), visible: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<LearningPathReply> => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!isOwner(email)) return { ok: false, error: "Not allowed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("learning_paths")
      .update({ visible: data.visible })
      .eq("slug", data.slug);
    if (error) return { ok: false, error: error.message };
    return { ok: true, paths: await allPaths() };
  });

/** Replace a path's section list. The numbering follows the new order. */
export const setLearningPathTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        slug: z.string().trim().min(1),
        topics: z.array(z.string().trim().min(2).max(120)).min(1).max(400),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<LearningPathReply> => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!isOwner(email)) return { ok: false, error: "Not allowed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("learning_paths")
      .update({ topics: data.topics.map((topic) => topic.trim()).filter(Boolean) })
      .eq("slug", data.slug);
    if (error) return { ok: false, error: error.message };
    return { ok: true, paths: await allPaths() };
  });
