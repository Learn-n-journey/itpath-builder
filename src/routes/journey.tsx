import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  Boxes,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileText,
  FlaskConical,
  HardDrive,
  Laptop,
  Lock,
  Map as MapIcon,
  Monitor,
  Network,
  Settings,
  Shield,
  Target,
  Terminal,
  Trophy,
  Wrench,
} from "lucide-react";

import { TopicRowMenu } from "@/components/learning/topic-row-menu";
import { Button } from "@/components/ui/button";
import { journeyPhases } from "@/data/journey-phases";
import { STAGE_EXAM_SIZE, STAGE_PASS_SCORE, stageExams } from "@/data/stage-exams";
import { labs } from "@/data/static-content";
import { useDismissable } from "@/hooks/use-dismissable";
import { adaptiveQueue } from "@/lib/adaptive-engine";
import {
  currentJourneyTopic,
  hasTopicActivity,
  isMastered,
  isTopicOpen,
  onJourney,
  sectionQuizBest,
  sectionQuizPassedAt,
} from "@/lib/journey-order";
import { topicScopeProgress } from "@/lib/scope-progress";
import { cn } from "@/lib/utils";
import { accentFill, accentSurface, accentText, journeyAccent } from "@/lib/visual-accents";
import { useAppState } from "@/state/app-state";
import { activeDomainKey } from "@/domain/active";

type TopicStatus = "closed" | "current" | "started" | "not-started" | "locked";
type JourneyFilter = "all" | "todo" | "passed" | "locked";

const FILTERS: { value: JourneyFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "passed", label: "Passed" },
  { value: "locked", label: "Locked" },
];

function statusMatchesFilter(status: TopicStatus, filter: JourneyFilter): boolean {
  if (filter === "all") return true;
  if (filter === "passed") return status === "closed";
  if (filter === "locked") return status === "locked";
  return status !== "closed" && status !== "locked";
}

function labIdFor(topicId: string): string | undefined {
  return labs.find((lab) => lab.topicId === topicId)?.id;
}


export const Route = createFileRoute("/journey")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Journey Map | IT PATH" },
      {
        name: "description",
        content:
          "The full IT PATH route, stage by stage, with each topic's real learning state from your recorded answers.",
      },
      { property: "og:title", content: "Your IT PATH Journey Map" },
      {
        property: "og:description",
        content: "See the whole path and how much of it holds up so far.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JourneyPage,
});

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const STATUS_WORD: Record<TopicStatus, string> = {
  closed: "Passed",
  current: "Currently on this one",
  started: "Started",
  "not-started": "Not started",
  locked: "Not started",
};

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

function JourneyPage() {
  const { user } = useAppState();
  const isAutoPath = activeDomainKey.split("@")[0] === "auto-repair";
  const current = currentJourneyTopic(user);
  const queue = adaptiveQueue(user);
  const [filter, setFilter] = useState<JourneyFilter>("all");

  const startHere = current ? queue.entries.find((entry) => entry.topic.id === current.id) : undefined;
  const {
    hidden: startHereCleared,
    dismiss: clearStartHere,
    restore: restoreStartHere,
  } = useDismissable("itpath.path.starting-point.cleared", startHere?.topic.id ?? null);

  function statusOf(topicId: string): TopicStatus {
    if (isMastered(user, topicId)) return "closed";
    if (current?.id === topicId) return "current";
    if (hasTopicActivity(user, topicId)) return "started";
    if (!isTopicOpen(user, topicId)) return "locked";
    return "not-started";
  }

  const phases = journeyPhases
    .map((phase) => ({ ...phase, topics: phase.topics.filter((topic) => onJourney(user, topic.id)) }))
    .filter((phase) => phase.topics.length > 0);

  const initialExpandedIndex = current
    ? phases.findIndex((phase) => phase.topics.some((topic) => topic.id === current.id))
    : 0;
  const defaultOpenIndex = initialExpandedIndex >= 0 ? initialExpandedIndex : 0;
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({
    [defaultOpenIndex]: true,
  });

  const toggleStage = (index: number) => {
    setExpandedStages((previous) => ({ ...previous, [index]: !previous[index] }));
  };

  return (
    <div className="relative -mx-3 -my-4 min-h-screen overflow-hidden pb-16 sm:-mx-5 sm:-my-6 lg:-mx-8 lg:-my-8">
      <div className="relative mx-auto w-full max-w-4xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
<nav
        aria-label="Path view"
        className="glass-surface mb-3 flex h-[3.25rem] w-full max-w-md items-center rounded-full border border-border/80 p-1 shadow-sm"
      >
        <Link
          to="/my-path"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors motion-safe:duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BookOpen className="size-4 shrink-0" aria-hidden />
          <span>{isAutoPath ? "Training Plan" : "My Path"}</span>
        </Link>
        <Link
          to="/journey"
          aria-current="page"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-[background-color,color] motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MapIcon className="size-4 shrink-0" aria-hidden />
          <span>{isAutoPath ? "Technician Journey" : "Journey Map"}</span>
        </Link>
      </nav>

      <div className="mb-4 flex justify-end">
        {startHere && startHereCleared ? (
          <button
            type="button"
            onClick={restoreStartHere}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Target className="size-3.5 shrink-0" aria-hidden />
            <span>{isAutoPath ? "Show my starting bay" : "Show my starting point"}</span>
          </button>
        ) : startHere ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-primary/80">
              <Target className="size-3.5 shrink-0 text-primary" aria-hidden />
              <span>{isAutoPath ? "Starting bay" : "Starting point"}: {startHere.topic.title}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={clearStartHere}>Hide</Button>
          </div>
        ) : null}
      </div>

      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{isAutoPath ? "Technician journey" : "Journey map"}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{isAutoPath ? "Build capability system by system, from shop fundamentals through diagnosis and repair." : "The complete learning route, stage by stage."}</p>
      </div>

      <ol className="relative space-y-4" aria-label={isAutoPath ? "Technician training stages" : "Learning route stages"}>
        {phases.map((phase, phaseIndex) => {
          const allPhaseTopics = phase.topics.map((topic) => ({ topic, status: statusOf(topic.id) }));
          const phaseTopics = allPhaseTopics.filter((entry) => statusMatchesFilter(entry.status, filter));
          const litUp = allPhaseTopics.filter((entry) => entry.status === "closed").length;
          const allLit = allPhaseTopics.length > 0 && litUp === allPhaseTopics.length;
          const isCurrentStage = allPhaseTopics.some((entry) => entry.status === "current");
          const pct = allPhaseTopics.length > 0 ? Math.round((litUp / allPhaseTopics.length) * 100) : 0;
          const accent = journeyAccent(phaseIndex, phases.length);
          const isExpanded = !!expandedStages[phaseIndex];
          const isLastStage = phaseIndex === phases.length - 1;

          return (
            <li key={phase.title} className="relative pl-12 sm:pl-14">
              {!isLastStage ? (
                <span
                  className={cn(
                    "absolute bottom-[-1rem] left-[1.125rem] top-10 w-0.5 rounded-full sm:left-[1.375rem]",
                    allLit ? accentFill[accent] : "bg-border/60",
                  )}
                  aria-hidden
                />
              ) : null}

              <div
                className={cn(
                  "absolute left-0 top-1 flex size-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all sm:size-10 sm:text-sm",
                  isCurrentStage
                    ? cn("border-current bg-background ring-4 ring-current/20 shadow-md", accentText[accent])
                    : allLit
                      ? cn("border-transparent text-primary-foreground", accentFill[accent])
                      : cn("border-border/80 ring-1", accentSurface[accent]),
                )}
                aria-hidden
              >
                {phaseIndex + 1}
              </div>

              <div
                className={cn(
                  "overflow-hidden rounded-2xl border transition-all",
                  isCurrentStage ? "border-primary/50 bg-card/80 shadow-md backdrop-blur-sm" : "border-border/60 bg-card/40 backdrop-blur-sm",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleStage(phaseIndex)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-foreground sm:text-lg">{phase.title}</h3>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground sm:text-sm">
                        {litUp} / {phase.topics.length}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">{phase.blurb}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60"
                        role="progressbar"
                        aria-label={`${phase.title} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={pct}
                      >
                        <div className={cn("h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500", accentFill[accent])} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                  </div>
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-secondary/30 text-muted-foreground">
                    {isExpanded ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t border-border/40 px-3 pb-4 pt-3 sm:px-5 sm:pb-5">
                    <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-1 sm:gap-2" role="group" aria-label={isAutoPath ? "Filter shop systems" : "Filter stage topics"}>
                      {FILTERS.map((entry) => (
                        <button
                          key={entry.value}
                          type="button"
                          onClick={() => setFilter(entry.value)}
                          aria-pressed={filter === entry.value}
                          className={cn(
                            "min-h-9 shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            filter === entry.value
                              ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                              : "border border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>

                    {phaseTopics.length > 0 ? (
                      <ul className="space-y-2">
                        {phaseTopics.map(({ topic, status }) => {
                          const best = sectionQuizBest(user, topic.id);
                          const passedAt = sectionQuizPassedAt(user, topic.id);
                          const open = status !== "locked";
                          const isCurrent = status === "current";
                          const isClosed = status === "closed";
                          const labId = labIdFor(topic.id);
                          const TopicIcon = getTopicIcon(topic);
                          const progress = Math.min(100, Math.max(0, Math.round(topicScopeProgress(user, topic.id).overall)));

                          return (
                            <li key={topic.id} className="group/row relative">
                              <div
                                className={cn(
                                  "flex items-center gap-2 rounded-xl border p-2.5 transition-all sm:gap-3 sm:p-3",
                                  isCurrent
                                    ? "border-primary/60 bg-primary/5 ring-1 ring-primary/20 shadow-xs"
                                    : open
                                      ? "border-border/50 bg-card/60 hover:border-border hover:bg-secondary/30"
                                      : "border-border/30 bg-card/20 opacity-70",
                                )}
                              >
                                <div
                                  className={cn(
                                    "flex size-9 shrink-0 items-center justify-center rounded-lg border sm:size-10",
                                    isCurrent
                                      ? "border-primary/30 bg-primary/15 text-primary"
                                      : isClosed
                                        ? "border-primary/20 bg-primary/10 text-primary"
                                        : open
                                          ? "border-border/60 bg-secondary text-foreground"
                                          : "border-border/30 bg-secondary/40 text-muted-foreground/60",
                                  )}
                                >
                                  {status === "locked" ? <Lock className="size-4" aria-hidden /> : <TopicIcon className="size-4 sm:size-5" aria-hidden />}
                                </div>

                                {open ? (
                                  <Link
                                    to="/topics/$topicId"
                                    params={{ topicId: topic.id }}
                                    aria-current={isCurrent ? "step" : undefined}
                                    className="group min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  >
                                    <span className={cn("block line-clamp-2 text-xs font-semibold leading-snug transition-colors sm:text-sm", isCurrent ? "font-bold text-primary" : "text-foreground group-hover:text-primary")}>
                                      {topic.title}
                                    </span>
                                    <span className="block truncate text-[11px] text-muted-foreground sm:text-xs">
                                      {isCurrent ? (
                                        <span className="font-semibold text-primary">{isAutoPath ? "Current training" : "Currently on this one"}</span>
                                      ) : isClosed ? (
                                        <span>
                                          {isAutoPath ? "Verified" : "Passed"}{best > 0 ? ` · ${isAutoPath ? "check" : "quiz"} ${best}%` : ""}{passedAt ? ` · ${shortDate(passedAt)}` : ""}
                                        </span>
                                      ) : status === "started" ? "In progress" : STATUS_WORD[status]}
                                    </span>
                                  </Link>
                                ) : (
                                  <div className="min-w-0 flex-1">
                                    <span className="block line-clamp-2 text-xs font-semibold leading-snug text-muted-foreground sm:text-sm">{topic.title}</span>
                                    <span className="block text-[11px] text-muted-foreground sm:text-xs">Not started</span>
                                  </div>
                                )}

                                <div className="hidden shrink-0 flex-col items-end gap-1 min-[430px]:flex">
                                  <span className="text-[11px] font-semibold tabular-nums text-foreground sm:text-xs">{progress}%</span>
                                  <div className="h-1 w-12 overflow-hidden rounded-full bg-border/60 sm:w-16">
                                    <div className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${progress}%` }} />
                                  </div>
                                </div>

                                {open ? (
                                  <div className="flex shrink-0 items-center gap-1">
                                    <Link
                                      to="/section-quiz/$topicId"
                                      params={{ topicId: topic.id }}
                                      title={`${isAutoPath ? "Check knowledge for" : "Take the"} ${topic.title}${isAutoPath ? "" : " quiz"}`}
                                      aria-label={`${isAutoPath ? "Check knowledge for" : "Take the"} ${topic.title}${isAutoPath ? "" : " quiz"}`}
                                      className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-secondary/40 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      <FileText className="size-3.5" aria-hidden />
                                    </Link>
                                    {labId ? (
                                      <Link
                                        to="/labs"
                                        search={{ lab: labId }}
                                        title={`Open the ${topic.title} ${isAutoPath ? "shop practice" : "lab"}`}
                                        aria-label={`Open the ${topic.title} ${isAutoPath ? "shop practice" : "lab"}`}
                                        className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-secondary/40 text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                      >
                                        <FlaskConical className="size-3.5" aria-hidden />
                                      </Link>
                                    ) : null}
                                    <TopicRowMenu topicId={topic.id} title={topic.title} />
                                    <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground/50 sm:block" aria-hidden />
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-xs text-muted-foreground">
                        No topics in this stage match this filter.
                      </p>
                    )}

                    {stageExams[phaseIndex] ? (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/20 p-3.5">
                        <p className="min-w-0 text-xs text-muted-foreground">
                          {isAutoPath ? "Technician checkpoint" : "End of stage exam"}: {STAGE_EXAM_SIZE} questions, written answers included. {STAGE_PASS_SCORE}% to pass.
                        </p>
                        <Link
                          to="/stage-exam/$stageId"
                          params={{ stageId: stageExams[phaseIndex]!.id }}
                          className="shrink-0 rounded-sm text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {isAutoPath ? "Open technician checkpoint" : `Open the ${stageExams[phaseIndex]!.stage} exam`} →
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card/50 p-4 sm:p-5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-feature-amber/25 bg-feature-amber/10 text-feature-amber sm:size-12">
          <Trophy className="size-5 sm:size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold text-foreground sm:text-base">{isAutoPath ? "Build technician capability" : "Your complete journey"}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {isAutoPath ? "Work through vehicle systems in order. New training opens as you demonstrate the knowledge, testing, diagnostic reasoning, and practical evidence needed to move forward." : "Follow this path from top to bottom. As you make progress, new sections unlock along your selected certification journey."}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
