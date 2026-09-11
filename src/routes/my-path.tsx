import { createFileRoute } from "@tanstack/react-router";
import { Route as RouteIcon } from "lucide-react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { tracks, topics } from "@/data/static-content";
import { useAppState, useStats } from "@/state/app-state";

export const Route = createFileRoute("/my-path")({
  head: () => ({
    meta: [
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

      <div className="mt-6">
        {tracks.length === 0 ? (
          <EmptyState
            icon={RouteIcon}
            title="Your roadmap is empty"
            body={`No tracks have been added to your path yet. Your plan is currently set for ${user.settings.experienceLevel === "none" ? "a complete beginner" : "your stated experience"}, aiming at ${user.settings.targetJob}.`}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tracks.map((track) => (
              <Panel key={track.id} title={track.title} description={track.description}>
                <p className="text-xs text-muted-foreground">Year {track.year}</p>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
