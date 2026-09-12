import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Award } from "lucide-react";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/static-content";
import {
  certificationStages,
  certificationStudyIndex,
  certificationsByLevel,
} from "@/lib/cert-path";
import { useAppState, useStats } from "@/state/app-state";
import { adaptivePath } from "@/lib/adaptive-path";

export const Route = createFileRoute("/my-path")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "My Path — IT PATH" },
      {
        name: "description",
        content: "Your roadmap organised by certification: entry-level first, then infrastructure, security and advanced work.",
      },
      { property: "og:title", content: "My Path — IT PATH" },
      {
        property: "og:description",
        content: "Every certification broken into start-here, core-skills and advanced stages.",
      },
    ],
  }),
  component: MyPath,
});

function MyPath() {
  const stats = useStats();
  const { user } = useAppState();
  const path = adaptivePath(user);
  const levels = certificationsByLevel();
  const certCount = levels.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <>
      <PageHeader
        title="My Path"
        description="The roadmap organised by certification, not by calendar. Start with entry-level certifications, then move into infrastructure, security and advanced work."
      />

      {path.recommendedTopic ? (
        <Panel className="mb-4" title={`${path.certification.title}: your starting point`} description={`${path.startLabel} based on your experience setting.`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{path.recommendedTopic.title}</p>
            <Button asChild size="sm"><Link to="/topics/$topicId" params={{ topicId: path.recommendedTopic.id }}>Start here <ArrowRight /></Link></Button>
          </div>
        </Panel>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Certifications" value={certCount} />
        <StatCard label="Topics available" value={topics.length} />
        <StatCard label="Topics completed" value={stats.topicsCompleted} />
        <StatCard label="Topics mastered" value={stats.topicsMastered} />
      </div>

      <div className="mt-6 space-y-5">
        {levels.map((group) => (
          <Panel key={group.level} title={group.label}>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((certification) => {
                const studyIndex = certificationStudyIndex(certification.id);
                const stages = certificationStages(certification.id);
                const hours = Math.round((studyIndex.totalMinutes / 60) * 10) / 10;

                return (
                  <div
                    key={certification.id}
                    className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-background/40 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
                        <Award className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-display text-sm font-semibold">{certification.title}</h4>
                        <p className="text-xs text-muted-foreground">{certification.code}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {certification.description}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {studyIndex.topics.length} topics · {hours}h recommended study
                    </p>

                    {stages.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {stages.map((stage) => (
                          <Badge key={stage.id} variant="outline">
                            {stage.label}: {stage.topics.length}
                          </Badge>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-auto flex justify-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/certifications/$certId" params={{ certId: certification.id }}>
                          Open certification
                          <ArrowRight aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
