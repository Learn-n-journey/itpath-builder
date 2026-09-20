// ============= Full file contents =============
/**
 * Owner-only "Sync now" trigger for the spreadsheet question sync.
 *
 * Runs the exact same routine as the nightly cron job, but is started from
 * the Settings page instead of waiting for the schedule. Only the owner
 * accounts may call it.
 */
import { createServerFn } from "@tanstack/react-start";

import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SyncNowReply =
  | {
      ok: true;
      skipped?: string | undefined;
      topics: number;
      approved: number;
      rejected: number;
      lessonsApproved: number;
      lessonsRejected: number;
    }
  | { ok: false; error: string };

type SyncScope = "it-cybersecurity" | "auto-repair" | "all";

export const syncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { scope?: SyncScope } | undefined) => ({
    scope: (input?.scope ?? "all") as SyncScope,
  }))
  .handler(async ({ context, data }): Promise<SyncNowReply> => {
    const email = (context.claims as { email?: string } | null)?.email;
    if (!OWNER_EMAILS.includes((email ?? "").trim().toLowerCase())) {
      return { ok: false, error: "Not allowed." };
    }

    const { runSheetSync } = await import("@/lib/sheet-sync.server");
    const result = await runSheetSync(data.scope === "all" ? {} : { domain: data.scope });
    if (!result.ok) return { ok: false, error: result.error ?? "The sync failed." };
    return {
      ok: true,
      skipped: result.skipped,
      topics: result.topics ?? 0,
      approved: result.approved ?? 0,
      rejected: result.rejected ?? 0,
      lessonsApproved: result.lessonsApproved ?? 0,
      lessonsRejected: result.lessonsRejected ?? 0,
    };
  });
