import { createFileRoute } from "@tanstack/react-router";
import { Award } from "lucide-react";

import { EmptyState, PageHeader, StatCard } from "@/components/page-kit";
import { certificationObjectives } from "@/data/static-content";
import { useAppState, useStats } from "@/state/app-state";

export const Route = createFileRoute("/certifications")({
  head: () => ({
    meta: [
      { title: "Certifications — IT PATH" },
      { name: "description", content: "Track exam objectives against the topics you have covered." },
      { property: "og:title", content: "Certifications — IT PATH" },
      { property: "og:description", content: "Map your study to real certification objectives." },
    ],
  }),
  component: Certifications,
});

function Certifications() {
  const { user } = useAppState();
  const stats = useStats();

  return (
    <>
      <PageHeader
        title="Certifications"
        description={`Your current target is ${user.settings.certificationTarget}. Objectives are ticked off by real completed topics only.`}
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Target" value={user.settings.certificationTarget} />
        <StatCard label="Objectives loaded" value={certificationObjectives.length} />
        <StatCard label="Topics covered" value={stats.topicsCompleted} />
      </div>
      <div className="mt-6">
        <EmptyState
          icon={Award}
          title="No objectives mapped yet"
          body="Exam objective maps are added with each certification module. Coverage will be calculated from your completed topics."
        />
      </div>
    </>
  );
}
