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
import { applyTopicFactCorrection, verifyImportedTopicFacts, type TopicFactualVerification } from "@/lib/admin.functions";
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
  { label: "Watch It", target: "#watch-it", when: () => true },
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
  const verifyFacts = useServerFn(verifyImportedTopicFacts);
  const applyFactCorrection = useServerFn(applyTopicFactCorrection);
  const [refreshing, setRefreshing] = useState(false);
  const [verifyingFacts, setVerifyingFacts] = useState(false);
  const [factVerification, setFactVerification] = useState<TopicFactualVerification | null>(null);
  const [fixingFact, setFixingFact] = useState<number | null>(null);
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
      const lessonReport = summary.report?.find((entry) => entry["lesson"] === "published");
      if (summary.lessonsApproved < 1) {
        const lessonIssue = summary.lessonIssues[0];
        const detail = lessonIssue
          ? `${lessonIssue.file}: ${lessonIssue.reasons.join("; ")}`
          : "No matching lesson workbook was published. Check the numbered workbook in this Path's Lessons folder.";
        toast.error(`Workbook lesson not loaded: ${detail}`, { duration: 10000 });
      } else {
        const file = String(lessonReport?.["file"] ?? "workbook");
        const storedTopicId = String(lessonReport?.["storedTopicId"] ?? refreshTopicId);
        const keyTerms = Number(lessonReport?.["keyTerms"] ?? 0);
        const sources = Number(lessonReport?.["sources"] ?? 0);
        toast.success(
          `Loaded ${file} → ${storedTopicId}: ${keyTerms} key terms, ${sources} sources, ${summary.approved} questions, ${summary.workTopics} try-it/lab update${summary.workTopics === 1 ? "" : "s"}.`,
          { duration: 10000 },
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "This topic could not be refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleVerifyFacts() {
    setVerifyingFacts(true);
    try {
      const result = await verifyFacts({ data: { topicId: refreshTopicId } });
      if (!result.owner) {
        toast.error("Only the owner can run factual verification.");
        return;
      }
      setFactVerification(result);
      if (result.error && result.findings.length === 0) {
        toast.error(result.error, { duration: 10000 });
      } else if (result.findings.length > 0) {
        toast.warning(`${result.findings.length} factual finding${result.findings.length === 1 ? "" : "s"} need review.`, { duration: 10000 });
      } else {
        toast.success("No factual errors were found in the imported lesson.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Factual verification could not finish.");
    } finally {
      setVerifyingFacts(false);
    }
  }

  async function handleFixFact(index: number) {
    const finding = factVerification?.findings[index];
    if (!finding?.correction) {
      toast.error("This finding does not include a proposed correction.");
      return;
    }
    const approved = window.confirm(
      `Apply this correction to the source workbook?\n\nFLAGGED:\n${finding.claim}\n\nREPLACEMENT:\n${finding.correction}`,
    );
    if (!approved) return;

    setFixingFact(index);
    try {
      const result = await applyFactCorrection({
        data: { topicId: refreshTopicId, claim: finding.claim, correction: finding.correction },
      });
      if (!result.ok) {
        toast.error(result.error ?? "The workbook could not be updated.", { duration: 10000 });
        return;
      }
      toast.success(`Fixed in ${result.sourceFile} → ${result.sheet} ${result.cell}. Refreshing and rechecking…`);
      await handleRefresh();
      const checked = await verifyFacts({ data: { topicId: refreshTopicId } });
      setFactVerification(checked);
      if (checked.findings.length === 0 && !checked.error) toast.success("Correction saved to the workbook and Verify Facts now passes.");
      else toast.warning(`Workbook updated. ${checked.findings.length} factual finding${checked.findings.length === 1 ? "" : "s"} remain.`, { duration: 10000 });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The workbook could not be updated.");
    } finally {
      setFixingFact(null);
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
            <>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden />
                {refreshing ? "Refreshing…" : "Refresh topic"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleVerifyFacts} disabled={verifyingFacts || refreshing}>
                <Shield className={verifyingFacts ? "animate-pulse" : ""} aria-hidden />
                {verifyingFacts ? "Verifying…" : "Verify facts"}
              </Button>
            </>
          ) : null}
          <Button asChild variant="secondary" size="sm">
            <Link to="/flashcards/$topicId" params={{ topicId: topic.id }}><Layers aria-hidden />Flashcards</Link>
          </Button>
          <TopicRowMenu topicId={topic.id} title={topic.title} />
        </div>

        {isOwner && factVerification ? (
          <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold">Factual verification</p>
              <span className={`text-xs font-medium ${factVerification.findings.length > 0 || factVerification.error ? "text-warning" : "text-success"}`}>
                {factVerification.findings.length > 0 ? `${factVerification.findings.length} TO REVIEW` : factVerification.error ? "INCOMPLETE" : "NO ERRORS FOUND"}
              </span>
            </div>
            {factVerification.sourceFile ? <p className="mt-1 text-[11px] text-muted-foreground">Checked imported file: {factVerification.sourceFile}</p> : null}
            {factVerification.error ? <p className="mt-2 text-xs text-warning">{factVerification.error}</p> : null}
            {factVerification.findings.length > 0 ? (
              <ul className="mt-2 divide-y divide-border/40">
                {factVerification.findings.map((finding, index) => (
                  <li key={index} className="py-2 text-xs">
                    <p className="font-medium">Flagged: {finding.claim}</p>
                    <p className="mt-1 text-muted-foreground">Why: {finding.problem}</p>
                    {finding.correction ? (
                      <>
                        <p className="mt-1 text-muted-foreground">Correction: {finding.correction}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          disabled={fixingFact !== null || refreshing || verifyingFacts}
                          onClick={() => handleFixFact(index)}
                        >
                          <Wrench className={fixingFact === index ? "animate-pulse" : ""} aria-hidden />
                          {fixingFact === index ? "Fixing…" : "Fix"}
                        </Button>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

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
