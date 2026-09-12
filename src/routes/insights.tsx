import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, CalendarCheck, Flame, Gauge, TrendingDown, TrendingUp } from "lucide-react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { computeInsights, type DayPoint, type TopicAccuracy } from "@/lib/insights-engine";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Study Insights — IT PATH" },
      {
        name: "description",
        content:
          "Trends from your own study record: time logged, quiz accuracy over time, weakest topics and the kinds of mistakes you repeat.",
      },
      { property: "og:title", content: "Study Insights — IT PATH" },
      {
        property: "og:description",
        content: "See how your study habits and accuracy are actually changing over time.",
      },
    ],
  }),
  component: Insights,
});

function DayBars({ days }: { days: DayPoint[] }) {
  const peak = Math.max(1, ...days.map((day) => day.minutes));
  return (
    <div>
      <div className="flex h-28 items-end gap-1">
        {days.map((day) => (
          <div
            key={day.dayStart}
            className="flex-1 rounded-sm bg-secondary"
            style={{ height: "100%" }}
            title={`${day.label}: ${day.minutes} min`}
          >
            <div className="flex h-full flex-col justify-end">
              <div
                className={day.minutes > 0 ? "rounded-sm bg-primary" : "rounded-sm bg-transparent"}
                style={{ height: `${Math.round((day.minutes / peak) * 100)}%`, minHeight: day.minutes > 0 ? 3 : 0 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{days[0]?.label}</span>
        <span>Peak {peak} min</span>
        <span>{days[days.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function AccuracyRow({ row }: { row: TopicAccuracy }) {
  return (
    <li>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2">
        <Link
          to="/topics/$topicId"
          params={{ topicId: row.topicId }}
          className="truncate text-sm hover:underline"
        >
          {row.title}
        </Link>
        <span className="text-xs font-semibold tabular-nums">{row.accuracy}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-secondary" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${row.accuracy}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {row.correct} of {row.total} answered correctly
      </p>
    </li>
  );
}

function Insights() {
  const { user } = useAppState();
  const insights = useMemo(() => computeInsights(user), [user]);

  if (!insights.hasData) {
    return (
      <>
        <PageHeader
          title="Study Insights"
          description="Trends calculated from your own record. Nothing here is simulated."
        />
        <EmptyState
          icon={Activity}
          title="No trends yet"
          body="Log study time or submit a quiz and this page starts showing how your habits and accuracy change week to week."
        >
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link to="/pomodoro">Start a timed session</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link to="/quiz-me">Take a quiz</Link>
            </Button>
          </div>
        </EmptyState>
      </>
    );
  }

  const trendUp = insights.momentum >= 0;
  const quizDelta = insights.quizAverageRecent - insights.quizAverageEarlier;

  return (
    <>
      <PageHeader
        title="Study Insights"
        description="How your study time, accuracy and mistakes are actually trending. Every figure comes from your own recorded work."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Last 7 days"
          value={`${insights.minutesLast7}m`}
          icon={trendUp ? TrendingUp : TrendingDown}
          hint={`${trendUp ? "+" : ""}${insights.momentum}m vs the week before`}
        />
        <StatCard
          label="Days studied"
          value={`${insights.daysStudiedLast28}/28`}
          icon={CalendarCheck}
          hint={`${insights.averageMinutesPerActiveDay}m on an active day`}
        />
        <StatCard
          label="Recent quiz average"
          value={`${insights.quizAverageRecent}%`}
          icon={Gauge}
          hint={
            insights.quizAverageEarlier > 0
              ? `${quizDelta >= 0 ? "+" : ""}${quizDelta} vs earlier attempts`
              : "Not enough attempts to compare yet"
          }
        />
        <StatCard
          label="Mistakes cleared"
          value={`${insights.resolutionRate}%`}
          icon={Flame}
          hint={`${insights.mistakesOpen} still open`}
        />
      </div>

      <div className="mt-6 grid gap-4">
        <Panel
          title="Study time, last 28 days"
          description="Each bar is one day of logged minutes, from the Pomodoro timer and completed study plans."
        >
          <DayBars days={insights.days} />
        </Panel>

        <Panel
          title="What your record shows"
          description="Plain observations, each one traceable to the data above."
        >
          <ul className="space-y-2 text-sm">
            {insights.observations.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span className="text-muted-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Weakest topics"
            description="Topics where you have answered at least three questions, worst first."
          >
            {insights.weakestTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Answer more questions per topic and this fills in.
              </p>
            ) : (
              <ul className="space-y-3">
                {insights.weakestTopics.map((row) => (
                  <AccuracyRow key={row.topicId} row={row} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Strongest topics" description="Where your answers hold up under questioning.">
            {insights.strongestTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing measured yet.</p>
            ) : (
              <ul className="space-y-3">
                {insights.strongestTopics.map((row) => (
                  <AccuracyRow key={row.topicId} row={row} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Quiz scores over time"
            description="Your most recent submitted attempts, oldest first."
          >
            {insights.quizTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submitted quizzes yet.</p>
            ) : (
              <div className="flex h-28 items-end gap-1.5">
                {insights.quizTrend.map((point) => (
                  <div key={point.id} className="flex h-full flex-1 flex-col justify-end">
                    <div
                      className="rounded-sm bg-primary"
                      style={{ height: `${Math.max(3, point.score)}%` }}
                      title={`${new Date(point.at).toLocaleDateString()}: ${point.score}%`}
                    />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Why you get things wrong"
            description="Your mistakes grouped by cause, not just by topic."
          >
            {insights.causes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mistakes recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {insights.causes.map((cause) => (
                  <li
                    key={cause.cause}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                  >
                    <span className="truncate">{cause.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {cause.open} open / {cause.total} total
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              <Button asChild size="sm" variant="secondary">
                <Link to="/weak-areas">Work on these</Link>
              </Button>
            </div>
          </Panel>
        </div>

        <Panel title="Evidence recorded" description="The raw counts behind every score in the app.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {insights.evidence.map((row) => (
              <div key={row.label} className="rounded-lg bg-secondary/50 px-3 py-2.5">
                <p className="font-display text-xl font-semibold tabular-nums">{row.count}</p>
                <p className="text-xs text-muted-foreground">{row.label}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
