import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Boxes,
  Briefcase,
  Check,
  ChevronRight,
  HardDrive,
  Laptop,
  Lock,
  Map as MapIcon,
  Monitor,
  Network,
  Settings,
  Shield,
  Terminal,
  Trophy,
  Wrench,
} from "lucide-react";

import { GaylPathNote } from "@/components/gayl/gayl-insights";
import { TopicRowMenu } from "@/components/learning/topic-row-menu";
import { LearnerPageSkeleton } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { topics } from "@/data/static-content";
import {
  certificationStages,
  certificationStudyIndex,
  certificationsByLevel,
} from "@/lib/cert-path";
import { useAppState, useStats } from "@/state/app-state";
import { adaptivePath } from "@/lib/adaptive-path";
import { adaptiveQueue } from "@/lib/adaptive-engine";
import { currentJourneyTopic, hasTopicActivity, isMastered } from "@/lib/journey-order";
import { CompactStat, CompactStats, ContentRow } from "@/components/learner-ui";
import { topicScopeProgress } from "@/lib/scope-progress";
import { accentFill, journeyAccent } from "@/lib/visual-accents";
import { cn } from "@/lib/utils";
import { learnerContinuity } from "@/lib/learner-continuity";

export const Route = createFileRoute("/my-path")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "My Path | IT PATH" },
      {
        name: "description",
        content: "Your learning roadmap from technology foundations through advanced IT and security skills.",
      },
      { property: "og:title", content: "My Path | IT PATH" },
      {
        property: "og:description",
        content: "A structured learning path from foundational concepts to advanced skills.",
      },
    ],
  }),
  component: MyPath,
});

function getTopicIcon(topic: { id: string; title: string }) {
  const text = `${topic.id} ${topic.title}`.toLowerCase();
  if (text.includes("hardware") || text.includes("computer") || text.includes("pc") || text.includes("peripherals")) return Monitor;
  if (text.includes("operating system") || text.includes("configuration")) return Settings;
  if (text.includes("network") || text.includes("lan") || text.includes("ip") || text.includes("router")) return Network;
  if (text.includes("command") || text.includes("terminal") || text.includes("cli") || text.includes("shell") || text.includes("bash")) return Terminal;
  if (text.includes("virtual") || text.includes("cloud") || text.includes("vm") || text.includes("hypervisor")) return Boxes;
  if (text.includes("career") || text.includes("work") || text.includes("professional") || text.includes("skills")) return Briefcase;
  if (text.includes("security") || text.includes("threat") || text.includes("firewall") || text.includes("malware")) return Shield;
  if (text.includes("storage") || text.includes("drive") || text.includes("raid") || text.includes("backup")) return HardDrive;
  if (text.includes("troubleshoot") || text.includes("repair") || text.includes("diagnostic")) return Wrench;
  return Laptop;
}

function topicStatusMetadata(
  entry: ReturnType<typeof adaptiveQueue>["entries"][number],
  user: Parameters<typeof isMastered>[0],
  isFeatured: boolean,
) {
  const stage = entry.topic.difficulty === "gentle" ? "Foundation" : entry.topic.difficulty === "standard" ? "Core" : "Advanced";
  const mastered = isMastered(user, entry.topic.id);
  const active = hasTopicActivity(user, entry.topic.id) || entry.mastery > 0;
  let status = "Not started";
  if (!entry.unlocked) status = "Locked · master the previous topic";
  else if (mastered) status = "Complete";
  else if (entry.openMistakes > 0) status = `${entry.openMistakes} open mistake${entry.openMistakes === 1 ? "" : "s"}`;
  else if (entry.dueReviews > 0) status = `${entry.dueReviews} review${entry.dueReviews === 1 ? "" : "s"} due`;
  else if (active) status = "In progress";
  else if (!isFeatured) status = "Up next";
  return `${stage} · ${status}`;
}

function MyPath() {
  const stats = useStats();
  const { user, hydrated } = useAppState();
  const path = adaptivePath(user);
  const queue = adaptiveQueue(user);
  const continuity = learnerContinuity(user);
  // The starting point is the first topic still waiting on you. As soon as the
  // next one opens, the one before it drops out of here.
  const current = currentJourneyTopic(user);
  const currentQueueIndex = current
    ? queue.entries.findIndex((entry) => entry.topic.id === current.id)
    : -1;
  const visibleStartIndex = currentQueueIndex >= 0 ? currentQueueIndex : 0;
  const displayedEntries = queue.entries.slice(visibleStartIndex, visibleStartIndex + 6);
  const startHere = current
    ? queue.entries.find((entry) => entry.topic.id === current.id)
    : undefined;
  const levels = certificationsByLevel();
  const certCount = levels.reduce((sum, group) => sum + group.items.length, 0);

  if (!hydrated) return <LearnerPageSkeleton rows={7} metrics={4} />;


  return (
    <div className="relative -mx-3 -my-4 min-h-screen overflow-hidden pb-12 sm:-mx-5 sm:-my-6 lg:-mx-8 lg:-my-8">
      <div className="relative mx-auto max-w-4xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
<nav
        aria-label="Path view"
        className="mb-5 flex h-11 w-full max-w-sm items-center border-b border-border/70"
      >
        <Link
          to="/my-path"
          aria-current="page"
          className="flex h-11 flex-1 items-center justify-center gap-2 border-b-2 border-primary px-4 text-sm font-semibold text-foreground transition-colors motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BookOpen className="size-4 shrink-0" aria-hidden />
          <span>My Path</span>
        </Link>
        <Link
          to="/journey"
          className="flex h-11 flex-1 items-center justify-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium text-muted-foreground transition-colors motion-safe:duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>Journey Map</span>
        </Link>
      </nav>

      <GaylPathNote className="mb-4" {...(current ? { topicId: current.id } : {})} />

      <section className="relative mb-7 overflow-hidden rounded-xl border border-border/70 bg-card/80 p-5 sm:p-6" aria-labelledby="path-next-action">
        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-medium text-primary">
                {continuity.kind === "study_plan" ? "Continue your session" : continuity.kind === "resume" ? "Pick up where you left off" : "Recommended next"}
              </p>
              <h2 id="path-next-action" className="mt-1 line-clamp-2 font-display text-lg font-semibold text-foreground">
                {continuity.label}
              </h2>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {continuity.reason}{continuity.minutes ? ` · About ${continuity.minutes} min` : ""}
              </p>
            </div>
            <Button asChild className="h-11 shrink-0 rounded-md px-6 text-sm font-semibold">
              <Link
                to={continuity.to as never}
                {...(continuity.params ? { params: continuity.params as never } : {})}
                {...(continuity.search ? { search: continuity.search as never } : {})}
              >
                Continue
                <ChevronRight className="ml-1 size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mb-6" aria-labelledby="your-order-heading">
        <div className="mb-4">
          <h2 id="your-order-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">Your next steps</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            You are here now. The next steps unlock as you prove the work behind them.
          </p>
        </div>

        <div className="relative space-y-4">
          {displayedEntries.map((entry, idx) => {
            const isLast = idx === displayedEntries.length - 1;
            const isFeatured = entry.topic.id === (queue.next?.topic.id ?? displayedEntries[0]?.topic.id);
            const isCompleted = isMastered(user, entry.topic.id);
            const hasActivity = hasTopicActivity(user, entry.topic.id) || entry.mastery > 0;
            const TopicIcon = getTopicIcon(entry.topic);
            const metadata = topicStatusMetadata(entry, user, isFeatured);
            const stepNumber = visibleStartIndex + idx + 1;

            return (
              <div key={entry.topic.id} className="relative flex items-center gap-3 sm:gap-4">
                <div className="relative flex w-10 shrink-0 flex-col items-center self-stretch">
                  {!isLast ? (
                    <div
                      aria-hidden
                      className={cn(
                        "absolute bottom-[-1.25rem] top-5 w-0.5",
                        isCompleted || isFeatured ? "bg-primary/80" : "bg-border/60",
                      )}
                    />
                  ) : null}
                  <div className="relative z-10 my-auto">
                    {isFeatured ? (
                      <div className="flex size-10 items-center justify-center rounded-full border-2 border-primary bg-background text-sm font-bold text-primary ring-4 ring-primary/20">
                        {stepNumber}
                      </div>
                    ) : isCompleted ? (
                      <div className="flex size-8 items-center justify-center rounded-full border border-primary/50 bg-primary/15 text-primary">
                        <Check className="size-4 stroke-[2.5]" aria-hidden />
                        <span className="sr-only">Complete</span>
                      </div>
                    ) : entry.unlocked ? (
                      <div className="flex size-8 items-center justify-center rounded-full border border-border/80 bg-secondary/60 text-xs font-semibold text-foreground/80">
                        {stepNumber}
                      </div>
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-full border border-border/40 bg-secondary/30 text-xs font-medium text-muted-foreground/50">
                        {stepNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  {isFeatured ? (
                    <div className="relative border-y border-primary/40 bg-primary/[0.035] px-1 py-4 sm:px-3 sm:py-5">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                        <span className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" aria-hidden />
                        <span>Next up</span>
                      </div>
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4">
                        <div className="flex size-9 shrink-0 items-center justify-center text-primary">
                          <TopicIcon className="size-6" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to="/topics/$topicId"
                            params={{ topicId: entry.topic.id }}
                            className="line-clamp-2 font-display text-base font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-lg"
                          >
                            {entry.topic.title}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">{metadata}</p>
                        </div>
                        <Button asChild size="sm" className="col-span-2 h-10 rounded-md font-semibold sm:col-span-1">
                          <Link to="/topics/$topicId" params={{ topicId: entry.topic.id }}>
                            {hasActivity ? "Continue" : "Start"}
                            <ChevronRight className="ml-1 size-4" aria-hidden />
                          </Link>
                        </Button>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div
                          className="h-1 flex-1 overflow-hidden rounded-full bg-secondary/80"
                          role="progressbar"
                          aria-label={`${entry.topic.title} progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={entry.mastery}
                        >
                          <div
                            className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, entry.mastery))}%` }}
                          />
                        </div>
                        <span className="shrink-0 font-display text-xs tabular-nums text-muted-foreground">{entry.mastery}%</span>
                      </div>
                    </div>
                  ) : entry.unlocked ? (
                    <div className="group relative flex items-center justify-between gap-3 border-b border-border/60 px-1 py-3 transition-colors hover:bg-secondary/20 sm:px-2 sm:py-3.5">
                      <Link
                        to="/topics/$topicId"
                        params={{ topicId: entry.topic.id }}
                        className="grid min-h-11 min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
                          <TopicIcon className="size-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-foreground transition-colors group-hover:text-primary">{entry.topic.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{metadata}</p>
                        </div>
                      </Link>
                      <div className="flex shrink-0 items-center gap-1">
                        <TopicRowMenu topicId={entry.topic.id} title={entry.topic.title} className="opacity-60 hover:opacity-100" />
                        <ChevronRight className="size-5 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 border-b border-border/50 px-1 py-3 opacity-70 sm:px-2 sm:py-3.5">
                      <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground/50">
                          <TopicIcon className="size-5" aria-hidden />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium text-muted-foreground/80">{entry.topic.title}</p>
                          <p className="truncate text-xs text-muted-foreground/50">{metadata}</p>
                        </div>
                      </div>
                      <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground/50">
                        <Lock className="size-4" aria-hidden />
                        <span className="sr-only">Locked</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-3.5 border-y border-border/60 py-4">
          <div className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
            <Trophy className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-sm font-semibold text-foreground">Complete in order</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {queue.hasData
                ? "A topic opens once the one before it is mastered. Reviews and open mistakes are lifted to the top when they are due."
                : "Reviews and open mistakes move to the top once you have recorded some work."}
            </p>
          </div>
        </div>
      </section>

      <CompactStats className="grid-cols-4"><CompactStat label="Certification paths" value={certCount} /><CompactStat label="Topics" value={topics.length} /><CompactStat label="Completed" value={stats.topicsCompleted} /><CompactStat label="Mastered" value={stats.topicsMastered} /></CompactStats>

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
          <ol className="relative mt-5" aria-label="Learning journey">
            <span className="journey-spectrum absolute bottom-6 left-[0.8125rem] top-6 w-1 rounded-full opacity-55" aria-hidden />
            {currentIndex > 0 && (
              <span
                className="journey-spectrum absolute left-[0.8125rem] top-6 w-1 rounded-full"
                style={{ height: `calc(${Math.min(100, (currentIndex / Math.max(1, flat.length - 1)) * 100)}% - 3rem)`, backgroundSize: "100% calc(100% * " + (flat.length - 1) / Math.max(1, currentIndex) + ")" }}
                aria-hidden
              />
            )}
            {levels.map((group) => (
              <li key={group.level} className="relative">
                <p className="pb-1 pl-9 pt-4 text-xs font-medium text-muted-foreground">{group.label}</p>
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
                          className={cn("glass-surface block rounded-lg border", state === "current" ? "border-border" : "border-border/60", state === "future" && "opacity-80")}
                        >
                          <ContentRow icon={Award} accent={accent} title={certification.title} description={certification.description} metadata={`${studyIndex.topics.length} topics · ${stages.map((stage) => stage.label).join(" · ")}`} progress={progress} />
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
      </div>
    </div>
  );
}
