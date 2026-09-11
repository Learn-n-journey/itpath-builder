import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Review — IT PATH" },
      { name: "description", content: "Spaced review of past topics and unresolved mistakes." },
      { property: "og:title", content: "Review — IT PATH" },
      { property: "og:description", content: "Spaced repetition keeps what you learn from fading." },
    ],
  }),
  component: Review,
});

function Review() {
  const { user } = useAppState();
  const now = Date.now();
  const due = user.reviews.filter((r) => new Date(r.dueAt).getTime() <= now);

  return (
    <>
      <PageHeader
        title="Review"
        description="Spaced repetition over topics you have already covered, plus mistakes you have not resolved."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Scheduled" value={user.reviews.length} />
        <StatCard label="Due now" value={due.length} />
        <StatCard label="Open mistakes" value={user.mistakes.filter((m) => !m.resolved).length} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <EmptyState
          icon={RotateCcw}
          title="Nothing scheduled for review"
          body="Review items are created automatically once you complete topics and quizzes."
        />
        <Panel title="Mistake log">
          {user.mistakes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mistakes recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {user.mistakes.slice(0, 10).map((m) => (
                <li key={m.id} className="flex justify-between py-2">
                  <span>{m.topicId}</span>
                  <span className="text-muted-foreground">
                    {m.resolved ? "resolved" : "open"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
