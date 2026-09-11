import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { useAppState, useStats } from "@/state/app-state";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — IT PATH" },
      { name: "description", content: "An honest view of everything you have completed so far." },
      { property: "og:title", content: "Progress — IT PATH" },
      { property: "og:description", content: "Every number here comes from your own activity." },
    ],
  }),
  component: Progress,
});

function Progress() {
  const stats = useStats();
  const { user } = useAppState();

  return (
    <>
      <PageHeader
        title="Progress"
        description="Measured from your activity only. Nothing here is estimated or pre-filled."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Topics completed" value={stats.topicsCompleted} />
        <StatCard label="Topics mastered" value={stats.topicsMastered} />
        <StatCard label="Assignments" value={stats.assignmentsCompleted} />
        <StatCard label="Labs" value={stats.labsCompleted} />
        <StatCard label="Quiz attempts" value={stats.quizAttempts} />
        <StatCard label="Study time" value={`${stats.studyHours}h`} />
        <StatCard label="Open mistakes" value={stats.mistakes} />
        <StatCard label="Reviews" value={stats.reviewsDue} />
        <StatCard label="Notes" value={stats.notes} />
        <StatCard label="Bookmarks" value={stats.bookmarks} />
        <StatCard label="Portfolio" value={stats.portfolioProjects} />
        <StatCard label="Career tickets" value={stats.careerTickets} />
      </div>
      <Panel className="mt-6" title="Account">
        <p className="text-sm text-muted-foreground">
          Path started {new Date(user.createdAt).toLocaleDateString()} · {user.studySessions.length}{" "}
          study sessions logged.
        </p>
      </Panel>
    </>
  );
}
