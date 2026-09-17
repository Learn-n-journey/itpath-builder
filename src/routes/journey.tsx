import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";

import { PageHeader } from "@/components/page-kit";
import { journeyPhases } from "@/data/journey-phases";
import { STAGE_EXAM_SIZE, STAGE_PASS_SCORE, stageExams } from "@/data/stage-exams";
import {
  currentJourneyTopic,
  hasTopicActivity,
  isMastered,
  isTopicOpen,
  onJourney,
  sectionQuizBest,
  sectionQuizPassedAt,
} from "@/lib/journey-order";
import { useAppState } from "@/state/app-state";
import { cn } from "@/lib/utils";
import { SectionTabs, PATH_TABS } from "@/components/layout/section-tabs";

type TopicStatus = "closed" | "current" | "started" | "not-started" | "locked";


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

/** Marker for a section: a closed circle once it is passed, open while it is ahead. */
function StatusDot({ status }: { status: TopicStatus }) {
  if (status === "closed") {
    return (
      <span
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-hidden
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background"
        aria-hidden
      >
        <span className="size-1.5 rounded-full bg-primary" />
      </span>
    );
  }
  if (status === "started") {
    return <span className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-primary/50" aria-hidden />;
  }
  if (status === "locked") {
    return (
      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground/70" aria-hidden>
        <Lock className="size-3" />
      </span>
    );
  }
  return <span className="mt-0.5 size-4 shrink-0 rounded-full border-2 border-border" aria-hidden />;
}

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

function JourneyPage() {
  const { user } = useAppState();
  const current = currentJourneyTopic(user);

  function statusOf(topicId: string): TopicStatus {
    if (isMastered(user, topicId)) return "closed";
    if (current?.id === topicId) return "current";
    if (hasTopicActivity(user, topicId)) return "started";
    if (!isTopicOpen(user, topicId)) return "locked";
    return "not-started";
  }

  // Only the sections that belong to the certification chosen in settings.
  const phases = journeyPhases
    .map((phase) => ({ ...phase, topics: phase.topics.filter((topic) => onJourney(user, topic.id)) }))
    .filter((phase) => phase.topics.length > 0);
  const allTopics = phases.flatMap((phase) => phase.topics);
  const passed = allTopics.filter((topic) => isMastered(user, topic.id)).length;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <SectionTabs tabs={PATH_TABS} />
      <PageHeader
        title="Journey map"
        description="The whole route, stage by stage. A section closes once you pass its quiz, and the next one down becomes the one you are on."
      />

      <div className="mb-8">
        <div className="dashboard-summary rounded-xl p-5">
          <p className="text-sm text-foreground">
            {passed === 0
              ? `${allTopics.length} sections to work through.${current ? ` You are on ${current.title}.` : ""}`
              : `${passed} of ${allTopics.length} sections closed.${current ? ` You are on ${current.title} now.` : ""}`}
          </p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{
                width: `${allTopics.length > 0 ? Math.round((passed / allTopics.length) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      <ol className="relative space-y-6">
        {phases.map((phase, phaseIndex) => {
          const phaseTopics = phase.topics.map((topic) => ({
            topic,
            status: statusOf(topic.id),
          }));
          const litUp = phaseTopics.filter((entry) => entry.status === "closed").length;
          const allLit = phaseTopics.length > 0 && litUp === phaseTopics.length;
          const pct = phaseTopics.length > 0 ? Math.round((litUp / phaseTopics.length) * 100) : 0;


          return (
            <li key={phase.title} className="relative pl-9">
              {/* Connector line to the next phase */}
              {phaseIndex < phases.length - 1 ? (
                <span
                  className={cn(
                    "absolute left-[11px] top-9 h-[calc(100%-1rem)] w-px",
                    allLit ? "bg-primary/50" : "bg-border",
                  )}
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "absolute left-0 top-2 flex size-[23px] items-center justify-center rounded-full border-2 text-[10px] font-semibold tabular-nums transition-colors",
                  allLit
                    ? "border-primary bg-primary text-primary-foreground"
                    : litUp > 0
                      ? "border-primary/60 bg-background text-primary"
                      : "border-border bg-background text-muted-foreground",
                )}
                aria-hidden
              >
                {phaseIndex + 1}
              </span>

              <div
                className={cn(
                  "panel overflow-hidden p-5 transition-colors",
                  allLit ? "border-primary/40" : "border-border",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold">{phase.title}</h2>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                    {phase.stage}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{phase.blurb}</p>

                <div className="mt-4 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/60">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {litUp === 0
                      ? `${phase.topics.length} sections, none passed yet`
                      : `${litUp} of ${phase.topics.length} passed`}
                  </p>
                </div>

                <ul className="mt-4 space-y-1">
                  {phaseTopics.map(({ topic, status }) => {
                    const best = sectionQuizBest(user, topic.id);
                    const passedAt = sectionQuizPassedAt(user, topic.id);
                    return (
                      <li key={topic.id}>
                        <Link
                          to="/topics/$topicId"
                          params={{ topicId: topic.id }}
                          className={cn(
                            "group flex items-start gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-all hover:border-border hover:bg-secondary/50",
                            status === "current" && "border-primary/50 bg-primary/5",
                          )}
                        >
                          <StatusDot status={status} />
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "block text-sm font-medium transition-colors group-hover:text-primary",
                                status === "current" && "text-primary",
                                status === "locked" && "text-muted-foreground",
                              )}
                            >
                              {topic.title}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {STATUS_WORD[status]}
                              {status === "closed" && best > 0 ? ` · quiz ${best}%` : ""}
                              {status === "closed" && passedAt ? ` · passed ${shortDate(passedAt)}` : ""}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>


                {stageExams[phaseIndex] ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/20 p-3">
                    <p className="min-w-0 text-xs text-muted-foreground">
                      End of stage exam: {STAGE_EXAM_SIZE} questions, written answers included. {STAGE_PASS_SCORE}% to pass.
                    </p>
                    <Link
                      to="/stage-exam/$stageId"
                      params={{ stageId: stageExams[phaseIndex]!.id }}
                      className="shrink-0 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Open the {stageExams[phaseIndex]!.stage} exam
                    </Link>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
