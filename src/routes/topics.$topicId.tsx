import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, Layers, Lock, MessagesSquare } from "lucide-react";
import { blockingTopic } from "@/lib/journey-order";

import { TopicLearningExperience } from "@/components/learning/topic-learning-experience";
import { ObdPracticePanel } from "@/components/auto/obd-practice-panel";
import { TopicKnowledgePanel } from "@/components/knowledge/topic-knowledge-panel";
import { EmptyState, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { certifications, lessons, topics } from "@/data/static-content";
import { getCertification, getTopic } from "@/lib/app-data/selectors";
import { topicStudyTimeForSession } from "@/lib/study-time";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/topics/$topicId")({
  staticData: { sitemap: false },
  head: ({ params }) => {
    const topic = getTopic(params.topicId);
    const title = topic ? `${topic.title} | IT PATH` : "Topic not found | IT PATH";
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

/** Which part of the page each study stage jumps to. */
const STUDY_PART_TARGETS: Record<string, string | undefined> = {
  "Read the lesson": "#lesson-reading",
  "Second pass with notes": "#lesson-reading",
  "Work through the examples": "#worked-examples",
  "Recall from memory": "#recall",
  "Practice decision": "#practice",
  "Teach it back": "#teach-back",
  "Real-world scenario": "#scenario",
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

  const blocker = blockingTopic(user, topic.id);
  if (blocker) {
    return (
      <>
        <PageHeader
          title={topic.title}
          description="This topic opens a little later on your journey."
        />
        <EmptyState
          icon={Lock}
          title={`Master ${blocker.title} first`}
          body={`Your journey runs in order, so this one waits until ${blocker.title} is proven. Finish the recall, practice and teach back there and this opens on its own.`}
        >
          <Button asChild>
            <Link to="/topics/$topicId" params={{ topicId: blocker.id }}>
              Open {blocker.title}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/journey">See the journey</Link>
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

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link to="/flashcards/$topicId" params={{ topicId: topic.id }}>
            <Layers aria-hidden />
            Flashcards
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/community" search={{ room: topic.id }}>
            <MessagesSquare aria-hidden />
            Discuss this section
          </Link>
        </Button>
      </div>

      <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {[
          ["Certification", certification?.title ?? "General IT"],
          ["Status", progress ? "In progress" : "Not started"],
        ].map(([label, value], index) => (
          <div
            key={label}
            className={index === 2 ? "col-span-2 min-w-0 bg-card p-4 sm:col-span-1" : "min-w-0 bg-card p-4"}
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
            <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <Panel
        className="mb-4"
        title="What is in this topic"
        description="Work through it at your own pace. Tap any stage to jump straight to it."
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {studyTime.parts.map((part) => {
            const target = STUDY_PART_TARGETS[part.label];
            const inner = (
              <>
                <span className="block text-sm font-medium text-foreground">{part.label}</span>
                <p className="mt-1 text-xs text-muted-foreground">{part.detail}</p>
                {target ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    Jump to this <ArrowRight className="size-3" aria-hidden />
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={part.label}>
                {target ? (
                  <a
                    href={target}
                    className="block h-full rounded-lg border border-border bg-secondary/20 p-4 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="h-full rounded-lg border border-border bg-secondary/20 p-4">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </Panel>


      <TopicLearningExperience topic={topic} />

      <div className="mt-4">
        <ObdPracticePanel topicId={topic.id} topicTitle={topic.title} />
      </div>


      <div className="mt-4">
        <Panel
          title="Section quiz"
          description="Twenty questions on this section alone, part multiple choice and part written in your own words. Eighty percent is a pass."
        >
          <Link
            to="/section-quiz/$topicId"
            params={{ topicId: topic.id }}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            Take the section quiz
          </Link>
        </Panel>
      </div>

      <div className="mt-4">
        <TopicKnowledgePanel topicId={topic.id} />
      </div>

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
                {lesson.nextSteps.map((step, index) => {
                  const marker = "Hardware Explorer";
                  const at = step.indexOf(marker);
                  return (
                    <li key={step} className="flex gap-3">
                      <span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span>
                      <span>
                        {at === -1 ? (
                          step
                        ) : (
                          <>
                            {step.slice(0, at)}
                            <Link
                              to="/explore-hardware"
                              className="font-medium text-primary hover:underline"
                            >
                              {marker}
                            </Link>
                            {step.slice(at + marker.length)}
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          ))}
      </div>
    </article>
  );
}