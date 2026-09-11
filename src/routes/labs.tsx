import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";

import { EmptyState, PageHeader, StatCard } from "@/components/page-kit";
import { labs } from "@/data/static-content";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/labs")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Labs — IT PATH" },
      { name: "description", content: "Guided hands-on labs and your lab attempt history." },
      { property: "og:title", content: "Labs — IT PATH" },
      { property: "og:description", content: "Hands-on IT and security labs with tracked attempts." },
    ],
  }),
  component: Labs,
});

function Labs() {
  const { user } = useAppState();
  const attempts = user.labAttempts;

  return (
    <>
      <PageHeader
        title="Labs"
        description="Hands-on exercises you run yourself — networking, systems, and security tooling."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Available" value={labs.length} />
        <StatCard label="Attempts" value={attempts.length} />
        <StatCard label="Completed" value={attempts.filter((a) => a.status === "completed").length} />
      </div>
      <div className="mt-6">
        {labs.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No labs loaded"
            body="Lab exercises are added alongside the curriculum. You have not completed any labs yet."
          />
        ) : (
          <ul className="space-y-2">
            {labs.map((l) => (
              <li key={l.id} className="panel p-4 text-sm">
                <p className="font-medium">{l.title}</p>
                <p className="mt-1 text-muted-foreground">{l.objective}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
