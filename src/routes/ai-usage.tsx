import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Activity, Coins, Database, Gauge } from "lucide-react";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { getAiDashboard, type AiDashboard } from "@/lib/ai-dashboard.functions";
import { formatCost } from "@/lib/ai/pricing";

export const Route = createFileRoute("/ai-usage")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "AI usage and cost — IT PATH" },
      {
        name: "description",
        content: "Internal view of AI calls, tokens, cache hits, estimated cost and savings by feature.",
      },
      { property: "og:title", content: "AI usage and cost — IT PATH" },
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
