import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen } from "lucide-react";

import { TopicLearningExperience } from "@/components/learning/topic-learning-experience";
import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { certifications, lessons, topics } from "@/data/static-content";
import { getCertification, getTopic } from "@/lib/app-data/selectors";
import { stageLabels, type StageId } from "@/lib/cert-path";
import { formatStudyTime, topicStudyTimeForSession } from "@/lib/study-time";
import type { Difficulty } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/topics/$topicId")({
  head: ({ params }) => {
    const topic = getTopic(params.topicId);
    const title = topic ? `${topic.title} — IT PATH` : "Topic not found — IT PATH";
    const description = topic?.summary ?? "The requested IT PATH curriculum topic could not be found.";
    return {
      meta: [
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: TopicPage,
});

const difficultyLabels = {
  gentle: "Beginner",
  standard: "Intermediate",
  challenging: "Advanced",
} as const;

const difficultyToStage: Record<Difficulty, StageId> = {
  gentle: "foundation",
  standard: "core",
  challenging: "advanced",
};

function TopicPage() {
  const { topicId } = Route.useParams();
  const topic = getTopic(topicId);
  const { user } = useAppState();

  if (!topic) {
    return (
      <>
        <PageHeader title="Topic not found" description="This curriculum topic does not exist." />
        <EmptyState
          icon={BookOpen}
          title="No topic at this address"
          body="Return to My Path to choose one of the available curriculum topics."
        >
          <Button asChild>
            <Link to="/my-path">Return to My Path</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const topicLessons = lessons.filter((lesson) => lesson.topicId === topic.id);
  const certification = getCertification(topic.certificationId);
  const progress = user.topicProgress[topic.id];
  const prerequisites = topic.prerequisiteTopicIds
    .map((id) => topics.find((candidate) => candidate.id === id))
    .filter((candidate) => candidate !== undefined);
  const studyTime = topicStudyTimeForSession(topic.id, user.settings.sessionLengthMinutes);

  return (
    <article>
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3">
        <Link to="/my-path">
          <ArrowLeft aria-hidden />
          My Path
        </Link>
      </Button>

      <PageHeader title={topic.title} description={topic.summary} />

      <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-5">
        {[
          ["Certification", certification?.title ?? "General IT"],
          ["Stage", stageLabels[difficultyToStage[topic.difficulty]]],
          ["Difficulty", difficultyLabels[topic.difficulty]],
          ["Recommended study time", formatStudyTime(studyTime.totalMinutes)],
          ["Status", progress ? "In progress" : "Not started"],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={index === 4 ? "col-span-2 min-w-0 bg-card p-4 sm:col-span-1" : "min-w-0 bg-card p-4"}
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <Panel
        className="mb-4"
        title="Recommended study time"
        description={`About ${formatStudyTime(studyTime.totalMinutes)} in total, measured from the material on this page. At your session length of ${user.settings.sessionLengthMinutes} minutes that is ${studyTime.sessions} ${studyTime.sessions === 1 ? "sitting" : "sittings"}.`}
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {studyTime.parts.map((part) => (
            <li key={part.label} className="rounded-lg border border-border bg-secondary/20 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-foreground">{part.label}</span>
                <span className="shrink-0 text-sm tabular-nums text-primary">
                  {formatStudyTime(part.minutes)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{part.detail}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <TopicLearningExperience topic={topic} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Prerequisites">
            {prerequisites.length === 0 ? (
              <p className="text-sm text-muted-foreground">None. This topic starts from first principles.</p>
            ) : (
              <ul className="space-y-2">
                {prerequisites.map((prerequisite) => (
                  <li key={prerequisite.id}>
                    <Link
                      to="/topics/$topicId"
                      params={{ topicId: prerequisite.id }}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {prerequisite.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {topicLessons.map((lesson) => (
            <Panel key={`${lesson.id}-next`} title="Next steps">
              <ol className="space-y-3 text-sm text-muted-foreground">
                {lesson.nextSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          ))}
      </div>
    </article>
  );
}