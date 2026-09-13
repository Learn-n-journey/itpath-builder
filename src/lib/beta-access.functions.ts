import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The single account allowed to manage the beta access list. */
export const OWNER_EMAIL = "boleydavid7@outlook.com";

export interface BetaTester {
  email: string;
  note: string | null;
  created_at: string;
}

export type BetaListReply =
  | { ok: true; owner: true; testers: BetaTester[] }
  | { ok: true; owner: false; testers: [] }
  | { ok: false; error: string };

function isOwner(email: string | undefined | null) {
  return (email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}

export const listBetaTesters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BetaListReply> => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!isOwner(email)) return { ok: true, owner: false, testers: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("beta_access")
      .select("email, note, created_at")
      .order("created_at", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, owner: true, testers: (data ?? []) as BetaTester[] };
  });

export const addBetaTester = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ email: z.string().email(), note: z.string().max(200).optional() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<BetaListReply> => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!isOwner(email)) return { ok: false, error: "Not allowed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("beta_access")
      .upsert(
        { email: data.email.trim().toLowerCase(), note: data.note?.trim() || null },
        { onConflict: "email" },
      );
    if (error) return { ok: false, error: error.message };

    const { data: rows } = await supabaseAdmin
      .from("beta_access")
      .select("email, note, created_at")
      .order("created_at", { ascending: true });
    return { ok: true, owner: true, testers: (rows ?? []) as BetaTester[] };
  });

export const removeBetaTester = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ email: z.string() }).parse(data))
  .handler(async ({ context, data }): Promise<BetaListReply> => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!isOwner(email)) return { ok: false, error: "Not allowed." };
    if (data.email.trim().toLowerCase() === OWNER_EMAIL) {
      return { ok: false, error: "You cannot remove your own access." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("beta_access")
      .delete()
      .eq("email", data.email.trim().toLowerCase());
    if (error) return { ok: false, error: error.message };

    const { data: rows } = await supabaseAdmin
      .from("beta_access")
      .select("email, note, created_at")
      .order("created_at", { ascending: true });
    return { ok: true, owner: true, testers: (rows ?? []) as BetaTester[] };
  });
