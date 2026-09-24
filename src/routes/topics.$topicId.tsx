import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpen, Layers, Lock, MessagesSquare, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { blockingTopic, isMastered, nextJourneyTopic } from "@/lib/journey-order";

import { TopicLearningExperience, mediaFor } from "@/components/learning/topic-learning-experience";
import { EmptyState, LearnerPageSkeleton, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { certifications, lessons, topics, type Topic } from "@/data/static-content";
import { getCertification, getTopic } from "@/lib/app-data/selectors";
import { activeDomainKey } from "@/lib/active-domain";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { loadOwnerLessons } from "@/lib/owner-lesson-store";
import { loadOwnerQuestions } from "@/lib/owner-question-store";
import { loadOwnerWork } from "@/lib/owner-work-store";
import { refreshTopic } from "@/lib/sheet-sync.functions";
import { useAuth } from "@/state/auth-state";
import { useAppState } from "@/state/app-state";
import { trackFlow } from "@/lib/flow-events.functions";
import { LearningBreadcrumbs } from "@/components/learning-breadcrumbs";

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

const TOPIC_SHORTCUTS = [
  { label: "Learn It", target: "#read-it", when: () => true },
  { label: "See It", target: "#see-it", when: () => true },
  { label: "Read It", target: "#read-more", when: (topic: Topic) => mediaFor(topic).some((resource) => resource.kind !== "video") },
  { label: "Watch It", target: "#watch-it", when: (topic: Topic) => mediaFor(topic).some((resource) => resource.kind === "video") },
  { label: "Try It", target: "#try-it", when: () => true },
  { label: "Prove It", target: "#prove-it", when: () => true },
] as const;

function TopicPage() {
  const { topicId } = Route.useParams();
  const topic = getTopic(topicId);
  const { user, hydrated } = useAppState();
  const { email } = useAuth();
  const refresh = useServerFn(refreshTopic);
  const [refreshing, setRefreshing] = useState(false);
  const isOwner = OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());

  // Count that a lesson opened, and whether it had teaching to show.
  const lessonFound = Boolean(topic);
  useEffect(() => {
    trackFlow("Open a lesson", lessonFound ? "ok" : "failed");
  }, [topicId, lessonFound]);

  if (!hydrated) return <LearnerPageSkeleton rows={6} metrics={3} />;

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
  const mastered = isMastered(user, topic.id);
  const next = mastered ? nextJourneyTopic(topic.id, user) : undefined;
  const prerequisites = topic.prerequisiteTopicIds
    .map((id) => topics.find((candidate) => candidate.id === id))
    .filter((candidate) => candidate !== undefined);
  const refreshTopicId = topic.id;
  const refreshTopicTitle = topic.title;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const domain = activeDomainKey().split("@")[0] ?? "";
      const result = await refresh({ data: { domain, topicId: refreshTopicId } });
      if (!result.ok || !result.summary) {
        toast.error(result.error ?? "This topic could not be refreshed.");
        return;
      }
      await Promise.all([loadOwnerQuestions(), loadOwnerLessons(), loadOwnerWork()]);
      const summary = result.summary;
      toast.success(
        `Refreshed ${refreshTopicTitle}: ${summary.lessonsApproved} lesson, ${summary.approved} questions, and ${summary.workTopics} try-it/lab update${summary.workTopics === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "This topic could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <article>
      <LearningBreadcrumbs items={[{ label: "My Path", to: "/my-path" }, ...(certification ? [{ label: certification.title, to: "/certifications/$certId", params: { certId: certification.id } }] : []), { label: topic.title }]} />

      <PageHeader title={topic.title} description={topic.summary} />

      <div className="mb-6 flex flex-wrap gap-2">
        {isOwner ? (
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden />
            {refreshing ? "Refreshing…" : "Refresh topic"}
          </Button>
        ) : null}
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
        title="Quick links"
        description="Jump straight to a learning stage."
      >
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TOPIC_SHORTCUTS.filter((shortcut) => shortcut.when(topic)).map((shortcut) => (
            <li key={shortcut.label}>
              <a href={shortcut.target} className="flex h-full items-center justify-between gap-2 rounded-lg border border-border bg-secondary/20 p-3 text-sm font-medium text-foreground transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {shortcut.label}
                <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </Panel>


      <TopicLearningExperience topic={topic} />

      {mastered ? (
        <Panel className="mt-5 border-success/40" title={`${topic.title} mastered`} description="Your recorded evidence meets this topic's mastery requirements.">
          <div className="flex flex-wrap gap-2">
            {next ? <Button asChild><Link to="/topics/$topicId" params={{ topicId: next.id }}>Next topic <ArrowRight /></Link></Button> : <Button asChild><Link to="/my-path">Continue path <ArrowRight /></Link></Button>}
            <Button asChild variant="secondary"><Link to="/review">Review mistakes</Link></Button>
          </div>
        </Panel>
      ) : null}

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