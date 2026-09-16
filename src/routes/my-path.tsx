import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Award, Lock } from "lucide-react";

import { GaylPathNote } from "@/components/gayl/gayl-insights";
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
import { adaptivePath, experienceStartBlurb } from "@/lib/adaptive-path";
import { adaptiveQueue } from "@/lib/adaptive-engine";
import { currentJourneyTopic } from "@/lib/journey-order";
import { useDismissable } from "@/hooks/use-dismissable";

export const Route = createFileRoute("/my-path")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "My Path | IT PATH" },
      {
        name: "description",
        content: "Your roadmap organised by certification: entry-level first, then infrastructure, security and advanced work.",
      },
      { property: "og:title", content: "My Path | IT PATH" },
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
  const queue = adaptiveQueue(user);
  // The starting point is the first topic still waiting on you. As soon as the
  // next one opens, the one before it drops out of here.
  const current = currentJourneyTopic(user);
  const startHere = current
    ? queue.entries.find((entry) => entry.topic.id === current.id)
    : undefined;
  // Cleared starting points come back on their own once the next section opens.
  const {
    hidden: startHereCleared,
    dismiss: clearStartHere,
    restore: restoreStartHere,
  } = useDismissable("itpath.path.starting-point.cleared", startHere?.topic.id ?? null);
  const levels = certificationsByLevel();
  const certCount = levels.reduce((sum, group) => sum + group.items.length, 0);


  return (
    <>
      <PageHeader
        title="My Path"
        description="The roadmap organised by certification, not by calendar. Start with entry-level certifications, then move into infrastructure, security and advanced work."
      />

      {startHere && !startHereCleared ? (
        <Panel
          className="mb-4"
          title={`${path.certification.title}: your starting point`}
          description={`${experienceStartBlurb(user.settings.experienceLevel)} This is the first thing in the order below.`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">{startHere.topic.title}</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearStartHere}>
                Not now
              </Button>
              <Button asChild size="sm"><Link to="/topics/$topicId" params={{ topicId: startHere.topic.id }}>Start here <ArrowRight /></Link></Button>
            </div>
          </div>
        </Panel>
      ) : startHere ? (
        <div className="mb-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={restoreStartHere}>
            Show my starting point
          </Button>
        </div>
      ) : null}


      <GaylPathNote className="mb-4" />

      <Panel
        className="mb-4"
        title="Your order"
        description="Work through the topics in the order shown. Anything you owe (due reviews and open mistakes) is lifted to the top."
      >
        <ul className="space-y-2">
          {queue.entries.slice(0, 6).map((entry) => (
            <li
              key={entry.topic.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{entry.topic.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.reason} {entry.mastery}% recorded.
                </p>
              </div>
              {entry.unlocked ? (
                <Button asChild size="sm" variant="secondary">
                  <Link to="/topics/$topicId" params={{ topicId: entry.topic.id }}>
                    Open
                  </Link>
                </Button>
              ) : (
                <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                  <Lock className="size-3" aria-hidden />
                  Locked
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          {queue.hasData
            ? "A topic opens once the one before it is mastered."
            : "Reviews and open mistakes move to the top once you have recorded some work."}
        </p>
      </Panel>


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
