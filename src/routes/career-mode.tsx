import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";

import { EmptyState, PageHeader, StatCard } from "@/components/page-kit";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/career-mode")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Career Mode — IT PATH" },
      { name: "description", content: "Simulated helpdesk tickets and real-world work practice." },
      { property: "og:title", content: "Career Mode — IT PATH" },
      { property: "og:description", content: "Practise the job with simulated support tickets." },
    ],
  }),
  component: CareerMode,
});

function CareerMode() {
  const { user } = useAppState();
  const s = user.careerScores;

  return (
    <>
      <PageHeader
        title="Career Mode"
        description="Simulated tickets that mirror a real support queue: diagnose, resolve, document."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Tickets completed" value={s.ticketsCompleted} />
        <StatCard label="Troubleshooting" value={s.troubleshooting} />
        <StatCard label="Communication" value={s.communication} />
        <StatCard label="Documentation" value={s.documentation} />
      </div>
      <div className="mt-6">
        <EmptyState
          icon={Briefcase}
          title="No tickets in your queue"
          body="Ticket scenarios are generated from curriculum topics you have studied. Your scores stay at zero until you work real tickets."
        />
      </div>
    </>
  );
}
