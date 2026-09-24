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
import { accentFill, journeyAccent } from "@/lib/visual-accents";
import { cn } from "@/lib/utils";

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

      {(() => {
        const flat = levels.flatMap((group) => group.items);
        const progressOf = (certId: string) => {
          const list = certificationStudyIndex(certId).topics;
          return list.length === 0 ? 0 : Math.round(list.reduce((sum, topic) => sum + topicScopeProgress(user, topic.id).overall, 0) / list.length);
        };
        const progressById = new Map(flat.map((c) => [c.id, progressOf(c.id)]));
        const currentId = flat.find((c) => (progressById.get(c.id) ?? 0) < 100)?.id;
        const currentIndex = currentId ? flat.findIndex((c) => c.id === currentId) : flat.length;
        let running = 0;
        return (
          <ol className="relative mt-5" aria-label="Certification journey">
            <span className="journey-spectrum absolute bottom-6 left-[0.8125rem] top-6 w-0.5 rounded-full opacity-35" aria-hidden />
            {currentIndex > 0 && (
              <span
                className="journey-spectrum absolute left-[0.8125rem] top-6 w-0.5 rounded-full"
                style={{ height: `calc(${Math.min(100, (currentIndex / Math.max(1, flat.length - 1)) * 100)}% - 3rem)`, backgroundSize: "100% calc(100% * " + (flat.length - 1) / Math.max(1, currentIndex) + ")" }}
                aria-hidden
              />
            )}
            {levels.map((group) => (
              <li key={group.level} className="relative">
                <p className="pb-1 pl-9 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.label}</p>
                <ul className="space-y-2">
                  {group.items.map((certification) => {
                    const index = running++;
                    const accent = journeyAccent(index, certCount);
                    const studyIndex = certificationStudyIndex(certification.id);
                    const stages = certificationStages(certification.id);
                    const progress = progressById.get(certification.id) ?? 0;
                    const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "future";
                    return (
                      <li key={certification.id} className="relative pl-9">
                        <span
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 rounded-full ring-4 ring-background",
                            accentFill[accent],
                            state === "current" ? "left-[0.3125rem] size-[1.125rem] shadow-[0_0_0_2px_var(--background),0_0_0_4px_currentColor]" : "left-[0.4375rem] size-3.5",
                            state === "future" && "opacity-40",
                          )}
                          style={state === "current" ? { color: `var(--feature-${accent})` } : undefined}
                          aria-hidden
                        />
                        <span className={cn("absolute left-[1.375rem] top-1/2 h-px w-3.5", accentFill[accent], state === "future" ? "opacity-25" : "opacity-70")} aria-hidden />
                        <Link
                          to="/certifications/$certId"
                          params={{ certId: certification.id }}
                          aria-current={state === "current" ? "step" : undefined}
                          className={cn("block rounded-lg border bg-card", state === "current" ? "border-border" : "border-border/60", state === "future" && "opacity-80")}
                        >
                          <ContentRow icon={Award} accent={accent} title={certification.title} eyebrow={certification.code} description={certification.description} metadata={`${studyIndex.topics.length} topics · ${stages.map((stage) => stage.label).join(" · ")}`} progress={progress} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        );
      })()}
    </>
  );
}
