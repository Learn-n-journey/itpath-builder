import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, Coins, Database, Gauge } from "lucide-react";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { getAiDashboard, type AiDashboard } from "@/lib/ai-dashboard.functions";
import { formatCost } from "@/lib/ai/pricing";
import { listContentReports, type ContentReportRow } from "@/lib/content-reports.functions";

export const Route = createFileRoute("/ai-usage")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "AI usage and cost | IT PATH" },
      {
        name: "description",
        content: "Internal view of AI calls, tokens, cache hits, estimated cost and savings by feature.",
      },
      { property: "og:title", content: "AI usage and cost | IT PATH" },
      {
        property: "og:description",
        content: "Internal view of AI calls, tokens, cache hits, estimated cost and savings by feature.",
      },
    ],
  }),
  component: AiUsagePage,
});

const WINDOWS = [1, 7, 30] as const;

function AiUsagePage() {
  const [days, setDays] = useState<number>(7);
  const [state, setState] = useState<
    { status: "loading" } | { status: "denied" } | { status: "error"; error: string } | { status: "ready"; data: AiDashboard }
  >({ status: "loading" });

  const load = useCallback(async (window: number) => {
    setState({ status: "loading" });
    try {
      const reply = await getAiDashboard({ data: { days: window } });
      if (!reply.ok) setState({ status: "error", error: reply.error });
      else if (!reply.owner) setState({ status: "denied" });
      else setState({ status: "ready", data: reply.data });
    } catch {
      setState({ status: "error", error: "Could not load the AI usage figures." });
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="AI usage and cost"
        description="Private view of every AI call the app makes: what it cost, what the cache saved, and where it went."
        actions={
          <div className="flex gap-2">
            {WINDOWS.map((window) => (
              <Button
                key={window}
                size="sm"
                variant={days === window ? "default" : "outline"}
                onClick={() => setDays(window)}
              >
                {window === 1 ? "24h" : `${window}d`}
              </Button>
            ))}
          </div>
        }
      />

      {state.status === "loading" ? (
        <Panel description="Loading…" />
      ) : state.status === "denied" ? (
        <Panel title="Not available" description="This page is for the app owner only." />
      ) : state.status === "error" ? (
        <Panel title="Could not load" description={state.error} />
      ) : (
        <Dashboard data={state.data} />
      )}

      {state.status === "ready" ? <ReportedProblems /> : null}
      {state.status === "ready" ? <LinkHealth /> : null}
      {state.status === "ready" ? <OriginalityTool /> : null}
    </div>
  );
}

/** What the nightly crawler found when it opened the outside links. */
function LinkHealth() {
  const [rows, setRows] = useState<LinkCheckRow[] | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("link_checks")
        .select("url, kind, label, status, ok, fail_count, last_error, checked_at")
        .order("ok", { ascending: true })
        .order("checked_at", { ascending: false })
        .limit(400);
      setRows((data ?? []) as LinkCheckRow[]);
    })();
  }, []);

  const broken = (rows ?? []).filter((row) => !row.ok);

  return (
    <div className="mt-6">
      <Panel
        title="Outside link health"
        description="A background check opens every training video and documentation page the lessons link to, a batch at a time."
      >
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">The checker has not run yet.</p>
        ) : broken.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {rows.length} links checked, all working. Last check {new Date(rows[0]!.checked_at ?? "").toLocaleString()}.
          </p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {broken.map((row) => (
              <li key={row.url} className="py-3">
                <p className="font-medium">{row.label ?? row.url}</p>
                <p className="text-xs text-muted-foreground">
                  {row.kind} · {row.status ?? "no answer"} · failed {row.fail_count} time
                  {row.fail_count === 1 ? "" : "s"}
                </p>
                <a href={row.url} className="text-xs text-primary hover:underline" rel="noreferrer" target="_blank">
                  {row.url}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** Paste text in and see how much of it repeats published or protected wording. */
function OriginalityTool() {
  const [markdown, setMarkdown] = useState("");
  const [protectedText, setProtectedText] = useState("");
  const [report, setReport] = useState<OriginalityReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const reply = await checkMarkdownOriginality({
        data: { markdown, protectedText: protectedText.trim() || undefined },
      });
      if (reply.ok) setReport(reply.report);
      else setError(reply.error);
    } catch {
      setError("Could not run the check. The text may be too short.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <Panel
        title="Originality check"
        description="Checks new writing against every published lesson, and against any protected wording you paste in."
      >
        <textarea
          className="min-h-32 w-full rounded-md border border-border bg-background p-3 text-sm"
          onChange={(event) => setMarkdown(event.target.value)}
          placeholder="Paste the new lesson or article text here"
          value={markdown}
        />
        <textarea
          className="mt-3 min-h-20 w-full rounded-md border border-border bg-background p-3 text-sm"
          onChange={(event) => setProtectedText(event.target.value)}
          placeholder="Optional: paste protected exam wording it must not mirror"
          value={protectedText}
        />
        <Button className="mt-3" disabled={busy || markdown.trim().length < 40} onClick={() => void run()}>
          {busy ? "Checking…" : "Check this text"}
        </Button>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {report ? (
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium">
              {report.verdict === "clear" ? "Looks original." : "Worth a rewrite before publishing."}
            </p>
            <p className="text-muted-foreground">
              {Math.round(report.againstCurriculum.overlap * 100)}% matches wording already published here.
            </p>
            {report.againstProtected ? (
              <p className="text-muted-foreground">
                {Math.round(report.againstProtected.overlap * 100)}% matches the protected wording you pasted.
              </p>
            ) : null}
            {report.againstCurriculum.matches.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Longest repeated run: “{report.againstCurriculum.matches[0]?.slice(0, 160)}”
              </p>
            ) : null}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

interface LinkCheckRow {
  url: string;
  kind: string;
  label: string | null;
  status: number | null;
  ok: boolean;
  fail_count: number;
  last_error: string | null;
  checked_at: string | null;
}

/** What learners have flagged as wrong in lessons, questions and AI answers. */
function ReportedProblems() {
  const [rows, setRows] = useState<ContentReportRow[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const reply = await listContentReports();
        setRows(reply.ok && reply.owner ? reply.reports : []);
      } catch {
        setRows([]);
      }
    })();
  }, []);

  return (
    <div className="mt-6">
      <Panel
        title="Reported problems"
        description="Flags learners raised on lessons, quiz questions and AI answers. Newest first."
      >
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing reported yet.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {rows.map((row) => (
              <li key={row.id} className="py-3">
                <p className="font-medium">{row.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {row.kind} · {row.label ?? row.refId} · {new Date(row.createdAt).toLocaleString()}
                </p>
                {row.note ? <p className="mt-1 text-sm text-muted-foreground">{row.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Dashboard({ data }: { data: AiDashboard }) {
  const tokens = data.promptTokens + data.completionTokens;
  const savingsShare = data.cost + data.saved === 0 ? 0 : data.saved / (data.cost + data.saved);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="AI requests" value={data.calls} hint={`${data.liveCalls} reached a model`} icon={Activity} />
        <StatCard
          label="Reused answers"
          value={data.cacheHits + data.dedupes}
          hint={`${Math.round(data.cacheHitRate * 100)}% of answerable requests`}
          icon={Database}
        />
        <StatCard label="Estimated cost" value={formatCost(data.cost)} hint="credits" icon={Coins} />
        <StatCard
          label="Estimated saving"
          value={formatCost(data.saved)}
          hint={`${Math.round(savingsShare * 100)}% of what it would have cost`}
          icon={Gauge}
        />
      </div>

      <Panel title="Tokens and behaviour">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <Stat label="Tokens in" value={data.promptTokens.toLocaleString()} />
          <Stat label="Tokens out" value={data.completionTokens.toLocaleString()} />
          <Stat label="Tokens total" value={tokens.toLocaleString()} />
          <Stat label="Escalated to stronger model" value={String(data.escalations)} />
          <Stat label="Self-checks run" value={String(data.selfChecks)} />
          <Stat label="Held back by budget" value={String(data.blocked)} />
        </dl>
      </Panel>

      <Panel
        title="Forecast"
        description="Straight-line projection from the recorded spend. Estimates in credits, not a bill."
      >
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <Stat label="Last 24 hours" value={formatCost(data.forecast.lastDay)} />
          <Stat label="Average per day" value={formatCost(data.forecast.dailyAverage)} />
          <Stat label="Projected 30 days" value={formatCost(data.forecast.projectedMonth)} />
        </dl>
      </Panel>

      <Panel title="By feature">
        {data.byFeature.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI calls recorded in this window.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="pb-2">Feature</th>
                  <th className="pb-2 text-right">Calls</th>
                  <th className="pb-2 text-right">Cached</th>
                  <th className="pb-2 text-right">Tokens</th>
                  <th className="pb-2 text-right">Cost</th>
                  <th className="pb-2 text-right">Saved</th>
                </tr>
              </thead>
              <tbody>
                {data.byFeature.map((row) => (
                  <tr key={row.feature} className="border-t border-border/60">
                    <td className="py-2">{row.label}</td>
                    <td className="py-2 text-right">{row.calls}</td>
                    <td className="py-2 text-right">{row.cacheHits}</td>
                    <td className="py-2 text-right">{row.tokens.toLocaleString()}</td>
                    <td className="py-2 text-right">{formatCost(row.cost)}</td>
                    <td className="py-2 text-right">{formatCost(row.saved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="By model">
        {data.byModel.length === 0 ? (
          <p className="text-sm text-muted-foreground">No model calls recorded in this window.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {data.byModel.map((row) => (
              <li key={row.model} className="flex items-center justify-between gap-4">
                <span className="min-w-0 truncate">{row.model}</span>
                <span className="shrink-0 text-muted-foreground">
                  {row.calls} calls · {row.tokens.toLocaleString()} tokens · {formatCost(row.cost)} credits
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
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
