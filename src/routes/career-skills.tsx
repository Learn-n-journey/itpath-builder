import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/career-skills")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Career Skills — IT PATH" },
      { name: "description", content: "The workplace skills that turn technical ability into a job." },
      { property: "og:title", content: "Career Skills — IT PATH" },
      { property: "og:description", content: "Communication, documentation and interview readiness." },
    ],
  }),
  component: CareerSkills,
});

const AREAS = [
  { name: "Ticket communication", detail: "Explaining a fix clearly to a non-technical user." },
  { name: "Documentation", detail: "Writing notes another technician can follow." },
  { name: "Escalation judgement", detail: "Knowing when to solve and when to hand off." },
  { name: "Interview readiness", detail: "Talking through your work with evidence." },
];

function CareerSkills() {
  const { user } = useAppState();
  const s = user.careerScores;

  return (
    <>
      <PageHeader
        title="Career Skills"
        description={`The non-technical half of the job, aimed at ${user.settings.targetJob}.`}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Skill areas">
          <ul className="space-y-3 text-sm">
            {AREAS.map((a) => (
              <li key={a.name}>
                <p className="font-medium">{a.name}</p>
                <p className="text-muted-foreground">{a.detail}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <EmptyState
          icon={Users}
          title="No skill ratings yet"
          body={`Ratings come from completed Career Mode tickets. You have completed ${s.ticketsCompleted}.`}
        />
      </div>
    </>
  );
}
