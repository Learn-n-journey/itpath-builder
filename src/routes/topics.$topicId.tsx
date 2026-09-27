import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpen, CheckCircle2, Clock, Layers, Lock, MessageSquare, Monitor, Network, RefreshCw, Settings, Shield, Terminal, Boxes, Briefcase, HardDrive, Laptop, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { blockingTopic, isMastered, nextJourneyTopic } from "@/lib/journey-order";

import { TopicLearningExperience, mediaFor } from "@/components/learning/topic-learning-experience";
import { TopicRowMenu } from "@/components/learning/topic-row-menu";
import { TopicQuickLinks } from "@/components/learning/topic-quick-links";
import { TopicSubnav, type TopicTab } from "@/components/learning/topic-subnav";
import { EmptyState, LearnerPageSkeleton, PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { lessons, topics, type Topic } from "@/data/static-content";
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
import { learnerContinuity } from "@/lib/learner-continuity";
import { domain } from "@/domain/active";
import { useOwnerContentVersion } from "@/hooks/use-owner-content";

export const Route = createFileRoute("/topics/$topicId")({
  staticData: { sitemap: false },
  head: ({ params }) => {
    const topic = getTopic(params.topicId);
    const title = topic ? `${topic.title} | ${domain.appName}` : `Topic not found | ${domain.appName}`;
    const description = topic?.summary ?? `The requested ${domain.appName} curriculum topic could not be found.`;
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
  { label: "Practice It", target: "#try-it", when: () => true },
  { label: "Prove It", target: "#prove-it", when: () => true },
] as const;


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

function TopicPage() {
  const { topicId } = Route.useParams();
  const topic = getTopic(topicId);
  const { user, hydrated } = useAppState();
  const { email } = useAuth();
  const refresh = useServerFn(refreshTopic);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TopicTab>("overview");
  const isOwner = OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
  // Workbook-backed media can arrive after the route first renders. Subscribe
  // here as well as inside the lesson experience so Read It / Watch It quick
  // links appear immediately when owner content finishes loading.
  useOwnerContentVersion();

  // Count that a lesson opened, and whether it had teaching to show.
  const lessonFound = Boolean(topic);
  useEffect(() => {
    trackFlow("Open a lesson", lessonFound ? "ok" : "failed");
  }, [topicId, lessonFound]);

  // Hooks must run before any early return below, or React crashes when the
  // page hydrates and the hook count changes.
  const continuity = useMemo(() => learnerContinuity(user), [user]);

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

  const TopicIcon = getTopicIcon(topic);
  const status = mastered ? "Passed" : progress ? "In progress" : "Not started";
  const availableTargets = new Set(
    TOPIC_SHORTCUTS.filter((shortcut) => shortcut.when(topic)).map((shortcut) => shortcut.target),
  );

  return (
    <article className="mx-auto w-full max-w-4xl">
      <LearningBreadcrumbs items={[{ label: "My Path", to: "/my-path" }, ...(certification ? [{ label: certification.title, to: "/certifications/$certId", params: { certId: certification.id } }] : []), { label: topic.title }]} />

      <section className="mb-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <TopicIcon className="size-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="mt-0.5 font-display text-xl font-bold leading-tight text-foreground sm:text-2xl">{topic.title}</h1>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">{topic.summary}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isOwner ? (
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden />
              {refreshing ? "Refreshing…" : "Refresh topic"}
            </Button>
          ) : null}
          <Button asChild variant="secondary" size="sm">
            <Link to="/flashcards/$topicId" params={{ topicId: topic.id }}><Layers aria-hidden />Flashcards</Link>
          </Button>
          <TopicRowMenu topicId={topic.id} title={topic.title} />
        </div>

        <Button asChild variant="ghost" className="mt-2.5 h-11 w-full justify-between rounded-lg border border-border/60 bg-muted/20 px-3.5">
          <Link to="/community" search={{ room: topic.id }}>
            <span className="flex items-center gap-2"><MessageSquare className="size-4 text-primary" aria-hidden />Discuss this section</span>
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>

        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <Shield className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0"><dt className="font-mono text-[10px] uppercase text-muted-foreground">Certification</dt><dd className="truncate text-xs font-semibold text-foreground">{certification?.title ?? "General"}</dd></div>
          </div>
          <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/50 bg-muted/20 p-2.5">
            {mastered ? <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden /> : <Clock className="size-4 shrink-0 text-primary" aria-hidden />}
            <div className="min-w-0"><dt className="font-mono text-[10px] uppercase text-muted-foreground">Status</dt><dd className="truncate text-xs font-semibold text-foreground">{status}</dd></div>
          </div>
        </dl>
      </section>

      <TopicSubnav activeTab={activeTab} onTabChange={setActiveTab} />


      {activeTab === "overview" ? (
        <>
          <TopicQuickLinks availableTargets={availableTargets} />
          <section className="mb-5 border-t border-border/60 pt-4">
            <h2 className="mb-3 font-display text-lg font-bold text-foreground">Learning objectives</h2>
            <ul className="space-y-3">
              {topic.learningObjectives.map((objective) => (
                <li key={objective} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span>{objective}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : activeTab === "objectives" ? (
        <section className="mb-5 rounded-xl border border-border/70 bg-card p-4">
          <h2 className="mb-3 font-display text-lg font-bold text-foreground">Learning objectives</h2>
          <ul className="space-y-3">{topic.learningObjectives.map((objective) => <li key={objective} className="flex gap-3 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /><span>{objective}</span></li>)}</ul>
        </section>
      ) : activeTab === "resources" ? (
        <div className="mb-5">
          <TopicLearningExperience topic={topic} view="resources" />
        </div>
      ) : (
        <div className="mb-5">
          <TopicLearningExperience topic={topic} view="notes" />
        </div>
      )}

      {activeTab === "overview" ? <TopicLearningExperience topic={topic} /> : null}

      {mastered ? (
        <Panel className="mt-5 border-success/40" title="Mastery earned">
          <p className="text-sm text-muted-foreground">
            You have enough evidence across this topic to move forward. Future review will keep checking that the knowledge holds over time.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link
                to={continuity.to as never}
                {...(continuity.params ? { params: continuity.params as never } : {})}
                {...(continuity.search ? { search: continuity.search as never } : {})}
              >
                {continuity.label}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </Panel>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Prerequisites">
          {prerequisites.length === 0 ? <p className="text-sm text-muted-foreground">None. This topic starts from first principles.</p> : <ul className="space-y-2">{prerequisites.map((prerequisite) => <li key={prerequisite.id}><Link to="/topics/$topicId" params={{ topicId: prerequisite.id }} className="text-sm font-medium text-primary hover:underline">{prerequisite.title}</Link></li>)}</ul>}
        </Panel>
        {topicLessons.map((lesson) => <Panel key={`${lesson.id}-next`} title="Next steps"><ol className="space-y-3 text-sm text-muted-foreground">{lesson.nextSteps.map((step, index) => <li key={step} className="flex gap-3"><span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span><span>{step}</span></li>)}</ol></Panel>)}
      </div>
    </article>
  );
}
