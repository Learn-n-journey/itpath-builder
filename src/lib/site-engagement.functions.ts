/**
 * Site-wide engagement figures. Owner accounts only; everyone else gets
 * owner: false and no data. All numbers come from real saved records.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";

export interface SiteEngagement {
  accounts: number;
  withProgress: number;
  activeLastDay: number;
  activeLastWeek: number;
  activeLastMonth: number;
  subscribed: number;
  totals: {
    studyMinutes: number;
    sessions: number;
    quizAttempts: number;
    topicsStarted: number;
    labsCompleted: number;
    teachBacks: number;
  };
}

export type SiteEngagementReply =
  | { ok: true; owner: true; data: SiteEngagement }
  | { ok: true; owner: false }
  | { ok: false; error: string };

interface UserStateRow {
  updated_at: string;
  data: { user?: unknown } | null;
}

export const getSiteEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SiteEngagementReply> => {
    const email = ((context.claims as { email?: string } | null)?.email ?? "")
      .trim()
      .toLowerCase();
    if (!OWNER_EMAILS.includes(email)) return { ok: true, owner: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profiles, states, subs] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("user_state").select("updated_at, data").limit(10000),
      supabaseAdmin
        .from("subscriptions")
        .select("user_id", { count: "exact", head: true })
        .in("status", ["active", "trialing"]),
    ]);

    if (states.error) return { ok: false, error: states.error.message };

    const now = Date.now();
    const dayAgo = now - 86_400_000;
    const weekAgo = now - 7 * 86_400_000;
    const monthAgo = now - 30 * 86_400_000;

    const result: SiteEngagement = {
      accounts: profiles.count ?? 0,
      withProgress: 0,
      activeLastDay: 0,
      activeLastWeek: 0,
      activeLastMonth: 0,
      subscribed: subs.count ?? 0,
      totals: {
        studyMinutes: 0,
        sessions: 0,
        quizAttempts: 0,
        topicsStarted: 0,
        labsCompleted: 0,
        teachBacks: 0,
      },
    };

    for (const row of (states.data ?? []) as unknown as UserStateRow[]) {
      const user = row.data?.user as
        | {
            studySessions?: { minutes?: number }[];
            quizAttempts?: unknown[];
            assignmentAttempts?: unknown[];
            labAttempts?: { completed?: boolean }[];
            recallResponses?: unknown[];
            practiceResponses?: unknown[];
            topicProgress?: Record<string, unknown>;
          }
        | undefined;
      if (!user) continue;

      const activity =
        (user.studySessions?.length ?? 0) +
        (user.quizAttempts?.length ?? 0) +
        (user.assignmentAttempts?.length ?? 0) +
        (user.labAttempts?.length ?? 0) +
        (user.recallResponses?.length ?? 0) +
        (user.practiceResponses?.length ?? 0) +
        Object.keys(user.topicProgress ?? {}).length;
      if (activity === 0) continue;

      result.withProgress += 1;
      const updated = Date.parse(row.updated_at);
      if (updated >= dayAgo) result.activeLastDay += 1;
      if (updated >= weekAgo) result.activeLastWeek += 1;
      if (updated >= monthAgo) result.activeLastMonth += 1;

      result.totals.sessions += user.studySessions?.length ?? 0;
      result.totals.studyMinutes += (user.studySessions ?? []).reduce(
        (sum, session) => sum + (session.minutes ?? 0),
        0,
      );
      result.totals.quizAttempts += user.quizAttempts?.length ?? 0;
      result.totals.topicsStarted += Object.keys(user.topicProgress ?? {}).length;
      result.totals.labsCompleted += (user.labAttempts ?? []).filter(
        (lab) => lab.completed,
      ).length;
      result.totals.teachBacks += user.practiceResponses?.length ?? 0;
    }

    return { ok: true, owner: true, data: result };
  });
