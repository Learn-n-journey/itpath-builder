/**
 * "Report a problem" on lessons, quiz questions and AI answers.
 *
 * Learners see the edge cases no sweep catches, so the quickest route to
 * accurate content is letting them flag it in one click. Reports are private
 * to the learner who filed them, and the owner reads them on the internal AI
 * usage page.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";

export const REPORT_REASONS = [
  "Something here is factually wrong",
  "The numbers do not add up",
  "The question is unclear or badly worded",
  "More than one answer looks correct",
  "It does not match the exam objectives",
  "Something else",
] as const;

const submitSchema = z.object({
  kind: z.enum(["lesson", "question", "ai_answer"]),
  refId: z.string().min(1).max(200),
  label: z.string().max(300).optional(),
  reason: z.string().min(1).max(200),
  note: z.string().max(2000).optional(),
});

export type ReportReply = { ok: true } | { ok: false; error: string };

export const reportContentProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => submitSchema.parse(data))
  .handler(async ({ data, context }): Promise<ReportReply> => {
    const { error } = await context.supabase.from("content_reports").insert({
      user_id: context.userId,
      kind: data.kind,
      ref_id: data.refId,
      label: data.label ?? null,
      reason: data.reason,
      note: data.note ?? null,
    });
    if (error) return { ok: false, error: "Could not send that report, try again." };
    return { ok: true };
  });

export interface ContentReportRow {
  id: string;
  kind: string;
  refId: string;
  label: string | null;
  reason: string;
  note: string | null;
  createdAt: string;
}

export type ContentReportList =
  | { ok: true; owner: true; reports: ContentReportRow[] }
  | { ok: true; owner: false }
  | { ok: false; error: string };

export const listContentReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContentReportList> => {
    const email = String(context.claims?.["email"] ?? "").toLowerCase();
    if (!OWNER_EMAILS.includes(email)) return { ok: true, owner: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("content_reports")
      .select("id, kind, ref_id, label, reason, note, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { ok: false, error: "Could not load the reports." };

    return {
      ok: true,
      owner: true,
      reports: (data ?? []).map((row) => ({
        id: row.id,
        kind: row.kind,
        refId: row.ref_id,
        label: row.label,
        reason: row.reason,
        note: row.note,
        createdAt: row.created_at,
      })),
    };
  });
