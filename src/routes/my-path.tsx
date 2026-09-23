import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Award, Lock } from "lucide-react";

import { GaylPathNote } from "@/components/gayl/gayl-insights";
import { TopicRowMenu } from "@/components/learning/topic-row-menu";
import { LearnerPageSkeleton, PageHeader, Panel } from "@/components/page-kit";
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
import { SectionTabs, PATH_TABS } from "@/components/layout/section-tabs";
import { CompactStat, CompactStats, ContentRow, ProgressLine } from "@/components/learner-ui";
import { topicScopeProgress } from "@/lib/scope-progress";

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
  const { user, hydrated } = useAppState();
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

  if (!hydrated) return <LearnerPageSkeleton rows={7} metrics={4} />;


  return (
    <>
      <PageHeader
        title="My Path"
        description="Your learning journey from foundational to advanced."
      />
      <SectionTabs tabs={PATH_TABS} />

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


      <GaylPathNote className="mb-4" {...(current ? { topicId: current.id } : {})} />

      <Panel
        className="mb-4"
        title="Your order"
        description="Work through the topics in the order shown. Anything you owe (due reviews and open mistakes) is lifted to the top."
      >
        <ul className="space-y-2">
          {queue.entries.slice(0, 6).map((entry) => (
            <li
              key={entry.topic.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{entry.topic.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {entry.reason} {entry.mastery}% recorded.
                </p>
              </div>
              {entry.unlocked ? (
                <>
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/topics/$topicId" params={{ topicId: entry.topic.id }}>
                      Open
                    </Link>
                  </Button>
                  <TopicRowMenu topicId={entry.topic.id} title={entry.topic.title} />
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                    <Lock className="size-3" aria-hidden />
                    Locked
                  </span>
                  <span />
                </>
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


      <CompactStats className="grid-cols-4"><CompactStat label="Certifications" value={certCount} /><CompactStat label="Topics" value={topics.length} /><CompactStat label="Completed" value={stats.topicsCompleted} /><CompactStat label="Mastered" value={stats.topicsMastered} /></CompactStats>

      <div className="relative mt-5 space-y-5 before:absolute before:bottom-4 before:left-3.5 before:top-9 before:w-px before:bg-border">
        {levels.map((group) => (
          <Panel key={group.level} title={group.label} className="relative pl-8 before:absolute before:left-2.5 before:top-4 before:size-2.5 before:rounded-full before:bg-primary">
            <div className="divide-y divide-border/70">
              {group.items.map((certification) => {
                const studyIndex = certificationStudyIndex(certification.id);
                const stages = certificationStages(certification.id);

                return (
                  <Link
                    key={certification.id}
                    to="/certifications/$certId"
                    params={{ certId: certification.id }}
                    className="block"
                  >
                    <ContentRow icon={Award} title={certification.title} eyebrow={certification.code} description={certification.description} metadata={`${studyIndex.topics.length} topics · ${stages.map((stage) => stage.label).join(" · ")}`} progress={studyIndex.topics.length === 0 ? 0 : Math.round(studyIndex.topics.reduce((sum, topic) => sum + topicScopeProgress(user, topic.id).overall, 0) / studyIndex.topics.length)} />
                  </Link>
                );
              })}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
