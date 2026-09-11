import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  FlaskConical,
  HelpCircle,
  Sparkles,
} from "lucide-react";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { useAppState, useStats } from "@/state/app-state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Dashboard — IT PATH" },
      {
        name: "description",
        content: "Your IT PATH dashboard: study time, completed topics, labs and quiz activity.",
      },
      { property: "og:title", content: "Dashboard — IT PATH" },
      {
        property: "og:description",
        content: "Track your two-year IT and cybersecurity study plan from one dashboard.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const stats = useStats();
  const { user, hydrated } = useAppState();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Target role: ${user.settings.targetJob}. Certification focus: ${user.settings.certificationTarget}.`}
        actions={
          <Button asChild>
            <Link to="/this-week">Plan this week</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Topics done"
          value={stats.topicsCompleted}
          icon={CheckCircle2}
          hint={`${stats.topicsMastered} mastered`}
        />
        <StatCard label="Study time" value={`${stats.studyHours}h`} icon={Clock} />
        <StatCard label="Assignments" value={stats.assignmentsCompleted} icon={ClipboardList} />
        <StatCard label="Labs" value={stats.labsCompleted} icon={FlaskConical} />
        <StatCard label="Quiz attempts" value={stats.quizAttempts} icon={HelpCircle} />
        <StatCard label="Open mistakes" value={stats.mistakes} />
        <StatCard label="Reviews due" value={stats.reviewsDue} />
        <StatCard label="Portfolio" value={stats.portfolioProjects} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Where you are"
          description={
            hydrated
              ? "Everything below is measured from your own activity — nothing is pre-filled."
              : "Loading your saved data…"
          }
        >
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Topics in progress: {stats.topicsInProgress}</li>
            <li>Notes saved: {stats.notes}</li>
            <li>Bookmarks: {stats.bookmarks}</li>
            <li>Career tickets completed: {stats.careerTickets}</li>
          </ul>
        </Panel>

        <Panel title="Start here" description="Three steps to get the path working for you.">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                Set your study hours, days and target role in{" "}
                <Link to="/settings" className="text-primary underline-offset-4 hover:underline">
                  Settings
                </Link>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                Review your two-year outline in{" "}
                <Link to="/my-path" className="text-primary underline-offset-4 hover:underline">
                  My Path
                </Link>
                .
              </span>
            </li>
            <li className="flex gap-3">
              <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>
                Log your first study session from{" "}
                <Link to="/this-week" className="text-primary underline-offset-4 hover:underline">
                  This Week
                </Link>
                .
              </span>
            </li>
          </ol>
        </Panel>
      </div>
    </>
  );
}
