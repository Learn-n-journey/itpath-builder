import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import { EmptyState, PageHeader, StatCard } from "@/components/page-kit";
import { assignments } from "@/data/static-content";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/assignments")({
  head: () => ({
    meta: [
      { title: "Assignments — IT PATH" },
      { name: "description", content: "Practical assignments and your submission history." },
      { property: "og:title", content: "Assignments — IT PATH" },
      { property: "og:description", content: "Hands-on IT assignments with tracked attempts." },
    ],
  }),
  component: Assignments,
});

function Assignments() {
  const { user } = useAppState();
  const attempts = user.assignmentAttempts;

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Applied work that proves you can do the job, not just answer questions about it."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Available" value={assignments.length} />
        <StatCard label="Started" value={attempts.filter((a) => a.status === "started").length} />
        <StatCard label="Submitted" value={attempts.filter((a) => a.status === "submitted").length} />
        <StatCard label="Completed" value={attempts.filter((a) => a.status === "completed").length} />
      </div>
      <div className="mt-6">
        {assignments.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No assignments loaded"
            body="Assignments arrive with each curriculum module. Your attempt history is empty because you have not started one yet."
          />
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id} className="panel p-4 text-sm">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 text-muted-foreground">{a.brief}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
