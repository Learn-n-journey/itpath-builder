import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { certifications, tracks, topics } from "@/data/static-content";
import { useAppState, useStats } from "@/state/app-state";

export const Route = createFileRoute("/my-path")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "My Path — IT PATH" },
      { name: "description", content: "Your personalised two-year IT and cybersecurity roadmap." },
      { property: "og:title", content: "My Path — IT PATH" },
      { property: "og:description", content: "A two-year roadmap tailored to your target role." },
    ],
  }),
  component: MyPath,
});

function MyPath() {
  const { user } = useAppState();
  const stats = useStats();
  const weeksToTarget = Math.round(104);

  return (
    <>
      <PageHeader
        title="My Path"
        description="The full two-year roadmap, shaped by your target role, experience level and weekly hours."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Plan length" value={`${weeksToTarget} wks`} hint="Two-year path" />
        <StatCard label="Weekly hours" value={user.settings.studyHoursPerWeek} />
        <StatCard label="Topics available" value={topics.length} />
        <StatCard label="Topics completed" value={stats.topicsCompleted} />
      </div>

      <div className="mt-6 space-y-5">
        {tracks.map((track) => {
          const trackTopics = topics.filter((topic) => topic.trackId === track.id);
          const months = [...new Set(trackTopics.map((topic) => topic.month))].sort((a, b) => a - b);

          return (
            <Panel
              key={track.id}
              title={`Year ${track.year} · ${track.title}`}
              description={track.description}
            >
              <div className="space-y-6">
                {months.map((month) => {
                  const monthTopics = trackTopics.filter((topic) => topic.month === month);
                  const weeks = [...new Set(monthTopics.map((topic) => topic.week))].sort((a, b) => a - b);

                  return (
                    <section key={month} aria-labelledby={`month-${track.year}-${month}`}>
                      <div className="mb-3 flex items-center gap-3">
                        <span className="font-mono text-xs font-medium text-primary">MONTH {month}</span>
                        <span className="h-px flex-1 bg-border" aria-hidden />
                      </div>

                      <div className="space-y-5">
                        {weeks.map((week) => (
                          <section key={week} aria-labelledby={`week-${track.year}-${month}-${week}`}>
                            <h3
                              id={`week-${track.year}-${month}-${week}`}
                              className="mb-2 text-sm font-semibold text-foreground"
                            >
                              Week {week}
                            </h3>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {monthTopics
                                .filter((topic) => topic.week === week)
                                .map((topic) => {
                                  const certification = certifications.find(
                                    (item) => item.id === topic.certificationId,
                                  );
                                  return (
                                    <div
                                      key={topic.id}
                                      className="flex min-w-0 items-start gap-3 rounded-lg border border-border bg-background/40 p-4"
                                    >
                                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                                        <BookOpen className="size-4" aria-hidden />
                                      </span>
                                      <div className="min-w-0 flex-1">
                                        <h4 className="font-display text-sm font-semibold">{topic.title}</h4>
                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                          {topic.summary}
                                        </p>
                                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                          <span className="text-xs text-muted-foreground">
                                            {certification?.title ?? "General IT"} · {topic.estimatedMinutes} min
                                          </span>
                                          <Button asChild variant="ghost" size="sm">
                                            <Link to="/topics/$topicId" params={{ topicId: topic.id }}>
                                              Open topic
                                              <ArrowRight aria-hidden />
                                            </Link>
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </section>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
