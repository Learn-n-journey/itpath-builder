import { useEffect, useState } from "react";

import { Panel } from "@/components/page-kit";
import { getSiteEngagement, type SiteEngagement } from "@/lib/site-engagement.functions";
import { useAuth } from "@/state/auth-state";
import { formatStudyTime } from "@/lib/study-time";

/**
 * Site-wide engagement, only ever rendered for the app owner. The server
 * double-checks the signed-in email before returning any figures.
 */
export function SiteEngagementPanel() {
  const { userId, ready } = useAuth();
  const [state, setState] = useState<
    { status: "loading" } | { status: "hidden" } | { status: "ready"; data: SiteEngagement }
  >({ status: "loading" });

  useEffect(() => {
    // Signed out there is no bearer token, so the owner-only call would fail
    // with an unauthorized error. Never ask in the first place.
    if (!ready || !userId) {
      setState({ status: "hidden" });
      return;
    }
    let cancelled = false;
    void getSiteEngagement().then((reply) => {
      if (cancelled) return;
      if (!reply.ok || !reply.owner) setState({ status: "hidden" });
      else setState({ status: "ready", data: reply.data });
    }).catch(() => {
      if (!cancelled) setState({ status: "hidden" });
    });
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  if (state.status !== "ready") return null;
  const d = state.data;

  return (
    <Panel
      className="mt-4"
      title="Site engagement"
      description="Only you can see this. Live figures from every account on it-path.net."
    >
      <dl className="grid gap-4 text-sm sm:grid-cols-3">
        <Stat label="Accounts" value={String(d.accounts)} />
        <Stat label="With recorded study" value={String(d.withProgress)} />
        <Stat label="Subscribed" value={String(d.subscribed)} />
        <Stat label="Active last 24h" value={String(d.activeLastDay)} />
        <Stat label="Active last 7 days" value={String(d.activeLastWeek)} />
        <Stat label="Active last 30 days" value={String(d.activeLastMonth)} />
        <Stat label="Study time, all learners" value={formatStudyTime(d.totals.studyMinutes)} />
        <Stat label="Study sessions" value={String(d.totals.sessions)} />
        <Stat label="Quiz attempts" value={String(d.totals.quizAttempts)} />
        <Stat label="Topics started" value={String(d.totals.topicsStarted)} />
        <Stat label="Labs completed" value={String(d.totals.labsCompleted)} />
        <Stat label="Teach back answers" value={String(d.totals.teachBacks)} />
      </dl>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-lg font-semibold">{value}</dd>
    </div>
  );
}
