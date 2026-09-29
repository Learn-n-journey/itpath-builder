import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";

export type MaintenanceDomain = "it-cybersecurity" | "auto-repair";

export type MaintenanceReply =
  | { ok: true; state: Record<string, boolean> }
  | { ok: false; error: string };

function isOwner(email: string | undefined | null) {
  return OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
}

/** Turn the maintenance screen on or off for one course. Owner only. */
export const setMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        domain: z.enum(["it-cybersecurity", "auto-repair"]),
        enabled: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<MaintenanceReply> => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!isOwner(email)) return { ok: false, error: "Not allowed." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("course_maintenance")
      .upsert(
        { domain: data.domain, enabled: data.enabled, updated_at: new Date().toISOString() },
        { onConflict: "domain" },
      );
    if (error) return { ok: false, error: error.message };

    const { data: rows } = await supabaseAdmin
      .from("course_maintenance")
      .select("domain, enabled");
    const state: Record<string, boolean> = {};
    for (const row of rows ?? []) state[row.domain] = row.enabled;
    return { ok: true, state };
  });
