import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircuitBoard,
  Cloud,
  Code2,
  Network,
  ShieldCheck as SecurityIcon,
  Terminal,
  FileText,
  FlaskConical,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  ArrowRight,
  Clock3,
  ListChecks,
  PlayCircle,
  Star,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { LearnerPageSkeleton, PageHeader, Panel } from "@/components/page-kit";
import { ProGate } from "@/components/pro-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { labs, topics } from "@/data/static-content";
import { isIdentificationLab } from "@/data/identification-labs";
import { IdentificationLab } from "@/components/labs/identification-lab";
import { A1DiagnosticTestPanel } from "@/components/auto/a1-diagnostic-test-panel";
import type { Lab, LabAttempt } from "@/lib/app-data/types";
import { projectFromLabAttempt } from "@/lib/portfolio-engine";
import { shuffleWithSeed, useShuffleSeed } from "@/lib/shuffle";
import { useAppState } from "@/state/app-state";
import { adaptivePath } from "@/lib/adaptive-path";
import { cn } from "@/lib/utils";
import { accentSurface } from "@/lib/visual-accents";
import { LearningBreadcrumbs } from "@/components/learning-breadcrumbs";
import { isStringPreference, useUiPreference } from "@/hooks/use-ui-preference";
import { learnerStatusLabel } from "@/lib/learner-status";
import { nextJourneyTopic } from "@/lib/journey-order";
import type { VisualAccent } from "@/lib/visual-accents";
import type { LucideIcon } from "lucide-react";
import { domain } from "@/domain/active";

export const Route = createFileRoute("/labs")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { lab?: string } =>
    typeof search['lab'] === "string" && search['lab'] ? { lab: search['lab'] } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: `Labs | ${domain.appName}` },
      { name: "description", content: "Complete guided practical labs with saved evidence and review." },
      { property: "og:title", content: `Labs | ${domain.appName}` },
      { property: "og:description", content: "Guided practical exercises for the systems you are learning." },
    ],
  }),
  component: LabsPageGated,
});

function LabsPageGated() {
  return (
    <ProGate feature={"Hands-on labs"}>
      <LabsPage />
    </ProGate>
  );
}

const categoryLabels: Record<Lab["category"], string> = {
  hardware: "Hardware",
  windows: "Windows",
  networking: "Networking",
  linux: "Linux",
  powershell: "PowerShell",
  bash: "Bash",
  dns: "DNS",
  security: "Security",
  cloud: "Cloud",
};

const categoryVisuals: Record<Lab["category"], { icon: LucideIcon; accent: VisualAccent }> = {
  hardware: { icon: CircuitBoard, accent: "amber" },
  windows: { icon: Code2, accent: "blue" },
  networking: { icon: Network, accent: "cyan" },
  linux: { icon: Terminal, accent: "orange" },
  powershell: { icon: Terminal, accent: "blue" },
  bash: { icon: Terminal, accent: "green" },
  dns: { icon: Network, accent: "violet" },
  security: { icon: SecurityIcon, accent: "coral" },
  cloud: { icon: Cloud, accent: "violet" },
};

function LabsPage() {
  const { user, hydrated } = useAppState();
  const { lab: requestedLabId } = Route.useSearch();
  const navigate = useNavigate();
  const focus = useMemo(() => adaptivePath(user), [user]);
  const [seed, reshuffle] = useShuffleSeed();
  const [selectedId, setSelectedId] = useUiPreference("labs.item", requestedLabId ?? "", isStringPreference);
  useEffect(() => {
    if (requestedLabId) setSelectedId(requestedLabId);
  }, [requestedLabId]);
  const shuffled = useMemo(() => {
    const focusIds = new Set(focus.topics.map((topic) => topic.id));
    return shuffleWithSeed(labs, seed).sort((a, b) => Number(focusIds.has(b.topicId)) - Number(focusIds.has(a.topicId)));
  }, [focus.topics, seed]);
  const lab = shuffled.find((item) => item.id === selectedId);
  const attempts = user.labAttempts;
  const latest = lab ? attempts.find((attempt) => attempt.labId === lab.id) : undefined;
  // Arriving from a section opens that one lab on its own, not the whole menu.
  const focused = Boolean(requestedLabId) && lab?.id === requestedLabId;
  const inProgressCount = attempts.filter((item) => item.status === "in_progress").length;
  const reviewCount = attempts.filter((item) => item.status === "needs_review").length;
  const completedCount = attempts.filter((item) => item.status === "completed" || item.status === "mastered").length;
  const recommended = shuffled.find((item) => !attempts.some((attempt) => attempt.labId === item.id && (attempt.status === "completed" || attempt.status === "mastered"))) ?? shuffled[0];
  const recommendedTopic = recommended ? topics.find((item) => item.id === recommended.topicId) : undefined;
  const categories = Array.from(new Set(shuffled.map((item) => item.category)));

  if (!hydrated) return <LearnerPageSkeleton rows={6} metrics={4} detail />;

  if (focused && lab) {
    return (
      <>
        <LearningBreadcrumbs items={[{ label: "Labs", to: "/labs" }, { label: lab.title }]} />
        <PageHeader
          title={lab.title}
          description={lab.objective}
          descriptionVisibility="visible"
          actions={
            <Button
              variant="outline"
              onClick={() => {
                setSelectedId("");
                void navigate({ to: "/labs", search: {} });
              }}
            >
              Browse all labs
            </Button>
          }
        />
        <div className="mt-6">
          <LabWorkspace key={lab.id} lab={lab} {...(latest ? { latestAttempt: latest } : {})} />
        </div>
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title={"Labs"}
        description="Hands-on practice in a safe environment."
        actions={<Button variant="outline" onClick={() => { reshuffle(); setSelectedId(""); }}><RefreshCw /> Shuffle</Button>}
      />

      {recommended ? (
        <section className="relative mt-2 overflow-hidden rounded-2xl border border-primary/45 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-lg">
          <div className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Star className="size-4 fill-current" aria-hidden />{"Recommended Lab"}</p>
              <p className="max-w-[48%] truncate text-xs font-medium text-primary">{categoryLabels[recommended.category]}</p>
            </div>
            <h2 className="mt-3 max-w-2xl font-display text-xl font-semibold sm:text-2xl">{recommended.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{recommendedTopic?.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{categoryLabels[recommended.category]}</Badge>
              <Badge variant="outline"><Clock3 className="mr-1 size-3" />{"Hands-on lab"}</Badge>
            </div>
            <Button className="mt-4 w-full sm:w-auto" onClick={() => setSelectedId(recommended.id)}>{"Start Lab"} <ArrowRight /></Button>
          </div>
        </section>
      ) : null}

      <section className="mt-4 grid grid-cols-4 gap-2" aria-label={"Lab progress"}>
        <LabStat icon={ListChecks} value={labs.length} label="Available" />
        <LabStat icon={PlayCircle} value={inProgressCount} label="In Progress" />
        <LabStat icon={RotateCcw} value={reviewCount} label="Review" />
        <LabStat icon={Trophy} value={completedCount} label="Completed" />
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div><h2 className="font-display text-lg font-semibold">{"Lab Library"}</h2><p className="text-xs text-muted-foreground">{labs.length} {"hands-on labs"}</p></div>
          <Button variant="outline" size="sm" onClick={() => { reshuffle(); setSelectedId(""); }}><RefreshCw className="size-4" />Shuffle</Button>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Badge className="shrink-0 rounded-full px-3 py-1.5">All</Badge>
          {categories.map((category) => <Badge key={category} variant="outline" className="shrink-0 rounded-full px-3 py-1.5">{categoryLabels[category]}</Badge>)}
        </div>

        <div className="mt-3 space-y-2">
          {shuffled.slice(0, 50).map((item) => {
            const itemAttempt = attempts.find((attempt) => attempt.labId === item.id);
            const visual = categoryVisuals[item.category];
            const Icon = visual.icon;
            const topic = topics.find((entry) => entry.id === item.topicId);
            const selected = item.id === lab?.id;
            return (
              <div key={item.id} className={cn("overflow-hidden rounded-xl border bg-card/70 transition-colors", selected ? "border-primary/55 shadow-sm" : "border-border/70")}>
                <button type="button" aria-expanded={selected} onClick={() => setSelectedId(selected ? "" : item.id)} className="group flex w-full items-center gap-3 p-3 text-left hover:bg-accent/50">
                  <span className={cn("grid size-12 shrink-0 place-items-center rounded-lg ring-1 ring-inset", accentSurface[visual.accent])}><Icon className="size-5" aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.6875rem] font-bold uppercase tracking-wide text-primary">{categoryLabels[item.category]}</span>
                    <span className="mt-0.5 block line-clamp-2 font-display text-sm font-semibold sm:text-base">{item.title}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">{topic?.title ?? learnerStatusLabel(itemAttempt?.status)}{itemAttempt ? ` · ${learnerStatusLabel(itemAttempt.status)}` : " · Not started"}</span>
                  </span>
                  <ArrowRight className={cn("size-4 shrink-0 text-primary transition-transform", selected && "rotate-90")} aria-hidden />
                </button>
                {selected ? (
                  <div className="border-t border-border/70 bg-muted/20 px-4 py-4">
                    <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-primary">{"Lab objective"}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.objective}</p>
                    <div className="mt-4">
                      <p className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">You'll practice</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{categoryLabels[item.category]}</Badge>
                        {topic ? <Badge variant="outline">{topic.title}</Badge> : null}
                        <Badge variant="outline">{item.environment}</Badge>
                      </div>
                    </div>
                    <Button className="mt-4 w-full sm:w-auto" onClick={(event) => { event.stopPropagation(); document.getElementById("selected-lab-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                      {itemAttempt?.status === "in_progress" ? domain.id === "auto-repair" ? "Continue Practice" : "Continue Lab" : "Start Lab"} <ArrowRight />
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {lab ? (
        <div id="selected-lab-workspace" className="mt-7 scroll-mt-24 border-t border-border pt-6">
          <LabWorkspace key={lab.id} lab={lab} {...(latest ? { latestAttempt: latest } : {})} />
        </div>
      ) : null}
    </div>
  );
}


function LabStat({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card/70 px-2 py-3 text-center">
      <Icon className="mx-auto size-4 text-primary" aria-hidden />
      <p className="mt-1 font-display text-lg font-semibold tabular-nums">{value}</p>
      <p className="truncate text-[0.625rem] text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}

function LabWorkspace({ lab, latestAttempt }: { lab: Lab; latestAttempt?: LabAttempt }) {
  const { user, actions } = useAppState();
  const [attemptId, setAttemptId] = useState(latestAttempt?.id ?? "");
  const attempt = user.labAttempts.find((item) => item.id === attemptId) ?? latestAttempt;
  const [checklist, setChecklist] = useState<Record<string, boolean>>(attempt?.checklist ?? {});
  const [reflection, setReflection] = useState(attempt?.reflection ?? "");
  const [showReview, setShowReview] = useState(false);
  const topic = topics.find((item) => item.id === lab.topicId);
  const next = nextJourneyTopic(lab.topicId, user);
  const history = useMemo(
    () => user.labAttempts.filter((item) => item.labId === lab.id),
    [lab.id, user.labAttempts],
  );
  const savedChecklist = JSON.stringify(attempt?.checklist ?? {});

  useEffect(() => {
    setAttemptId(latestAttempt?.id ?? "");
    setChecklist(latestAttempt?.checklist ?? {});
    setReflection(latestAttempt?.reflection ?? "");
    setShowReview(false);
  }, [lab.id, latestAttempt?.id]);

  useEffect(() => {
    setChecklist(attempt?.checklist ?? {});
    setReflection(attempt?.reflection ?? "");
  }, [attempt?.id, attempt?.reflection, savedChecklist]);

  const earnedScore = lab.checklist.reduce(
    (sum, item) => sum + (checklist[item.id] ? item.points : 0),
    0,
  );
  const maxScore = lab.checklist.reduce((sum, item) => sum + item.points, 0);
  const canEdit = attempt?.status === "in_progress" || attempt?.status === "needs_review";

  function start() {
    const now = new Date().toISOString();
    const next: LabAttempt = {
      id: crypto.randomUUID(),
      labId: lab.id,
      topicId: lab.topicId,
      status: "in_progress",
      checklist: {},
      reflection: "",
      score: 0,
      maxScore,
      createdAt: now,
      updatedAt: now,
    };
    actions.addLabAttempt(next);
    setAttemptId(next.id);
    setChecklist({});
    setReflection("");
    setShowReview(false);
    toast.success("Lab started.");
  }

  function update(patch: Partial<LabAttempt>) {
    if (!attempt) return;
    actions.updateLabAttempt({ ...attempt, ...patch, updatedAt: new Date().toISOString() });
  }

  function save() {
    if (!attempt) return;
    update({ checklist, reflection });
    toast.success("Lab progress saved.");
  }

  function submit() {
    if (!attempt) return;
    const now = new Date().toISOString();
    const complete = earnedScore === maxScore && reflection.trim().length >= 40;
    const projectId = attempt.portfolioProjectId ?? crypto.randomUUID();
    update({
      checklist,
      reflection: reflection.trim(),
      score: earnedScore,
      maxScore,
      status: complete ? "completed" : "needs_review",
      submittedAt: now,
      ...(complete ? { completedAt: now, portfolioProjectId: projectId } : {}),
    });
    if (complete && !user.portfolio.some((item) => item.labAttemptId === attempt.id)) {
      const prefilled = projectFromLabAttempt(
        lab,
        {
          ...attempt,
          status: "completed",
          score: earnedScore,
          maxScore,
          completedAt: now,
          reflection: reflection.trim(),
        },
        projectId,
      );
      actions.addPortfolioProject({
        ...prefilled,
        approach: `${prefilled.approach}\n\nReflection: ${reflection.trim()}`,
      });
    }
    setShowReview(true);
    toast.success(complete ? "Great work, that is added to your portfolio." : "That is in, ready for review.");
  }

  function markMastered() {
    if (!attempt || attempt.status !== "completed" || attempt.score < lab.masteryScore) return;
    update({ status: "mastered", reviewedAt: new Date().toISOString(), masteredAt: new Date().toISOString() });
    setShowReview(true);
    toast.success("Lab marked mastered after review.");
  }

  return (
    <div className="space-y-5">
      {domain.id === "auto-repair" && lab.id.endsWith("-a1-test-diagnose-verify") ? <A1DiagnosticTestPanel topicId={lab.topicId} /> : null}
      <LearningBreadcrumbs items={[{ label: "Labs", to: "/labs" }, ...(topic ? [{ label: topic.title, to: "/topics/$topicId", params: { topicId: topic.id } }] : []), { label: lab.title }]} />
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge>{categoryLabels[lab.category]}</Badge>
              <Badge variant="outline">{topic?.title}</Badge>
            </div>
            <h2 className="mt-3 font-display text-xl font-semibold">{lab.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{lab.objective}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Environment</dt><dd className="mt-1 text-sm">{lab.environment}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected result</dt><dd className="mt-1 text-sm">{lab.expectedResult}</dd></div>
        </dl>
      </Panel>

      <Panel title="Prerequisites">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{lab.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul>
      </Panel>
      <Panel title="Instructions" description={"Perform these steps yourself in the stated environment. The app records your work but does not physically execute or verify work outside the app."} descriptionVisibility="visible">
        <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">{lab.instructions.map((item) => <li key={item}>{item}</li>)}</ol>
      </Panel>

      {isIdentificationLab(lab.id) ? (
        <IdentificationLab lab={lab} />
      ) : !attempt ? (
        <Panel title="Ready to begin" description="Viewing this lab has not changed your progress.">
          <Button onClick={start}><FlaskConical /> Start lab</Button>
        </Panel>
      ) : (
        <>
          <Panel title="Checklist" description="Confirm only steps you personally completed and verified." descriptionVisibility="visible">
            <div className="space-y-3">
              {lab.checklist.map((item) => (
                <Label key={item.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                  <Checkbox
                    aria-label={item.label}
                    checked={checklist[item.id] ?? false}
                    disabled={!canEdit}
                    onCheckedChange={(checked) => setChecklist((current) => ({ ...current, [item.id]: checked === true }))}
                  />
                  <span className="text-sm font-normal">{item.label} <span className="text-muted-foreground">({item.points} points)</span></span>
                </Label>
              ))}
            </div>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-sm"><span>Checklist score</span><span className="tabular-nums">{earnedScore}/{maxScore}</span></div>
              <Progress value={earnedScore} />
            </div>
          </Panel>

          <Panel title="Reflection" description={lab.reflectionPrompt} descriptionVisibility="visible">
            <Textarea aria-label="Lab reflection" rows={6} value={reflection} onChange={(event) => setReflection(event.target.value)} disabled={!canEdit} placeholder="Explain your observations, reasoning, and what you would verify next." />
            <p className="mt-2 text-xs text-muted-foreground">A complete submission requires every checklist item and a substantive reflection of at least 40 characters.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" onClick={save} disabled={!canEdit}><Save /> Save</Button>
              <Button onClick={submit} disabled={!canEdit}><Send /> Submit</Button>
              {(attempt.status === "completed" || attempt.status === "mastered" || attempt.status === "needs_review") ? (
                <Button variant="secondary" onClick={() => setShowReview((current) => !current)}><FileText /> Review</Button>
              ) : null}
              {attempt.status === "completed" && attempt.score >= lab.masteryScore ? (
                <Button onClick={markMastered}><ShieldCheck /> Mark mastered</Button>
              ) : null}
              {(attempt.status === "completed" || attempt.status === "mastered") ? (
                <Button variant="outline" onClick={start}><RotateCcw /> Start new attempt</Button>
              ) : null}
            </div>
          </Panel>
        </>
      )}

      {attempt && showReview ? (
        <Panel title="Lab review" description="This review reflects your saved checklist and reflection, not inspection of an external environment.">
          <div className="flex flex-wrap items-center gap-3">
            <Badge data-learning-status>{learnerStatusLabel(attempt.status)}</Badge>
            <span className="text-sm font-medium tabular-nums">Score: {attempt.score}/{attempt.maxScore}</span>
          </div>
          {attempt.status === "needs_review" ? <p className="mt-3 text-sm text-warning">Complete every checklist item and provide a substantive reflection, then submit again.</p> : null}
          <div className="mt-4 rounded-md border border-border p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saved reflection</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{attempt.reflection || "No reflection submitted."}</p>
          </div>
          {attempt.portfolioProjectId ? <p className="mt-3 flex items-center gap-2 text-sm text-success"><CheckCircle2 className="size-4" /> Connected to Portfolio as completed lab evidence.</p> : null}
        </Panel>
      ) : null}

      {attempt && (attempt.status === "completed" || attempt.status === "mastered") ? (
        <Panel title={attempt.status === "mastered" ? `${lab.title} mastered` : "Lab complete"}>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm"><Link to="/topics/$topicId" params={{ topicId: lab.topicId }}>Return to topic</Link></Button>
            {next ? <Button asChild size="sm" variant="secondary"><Link to="/topics/$topicId" params={{ topicId: next.id }}>Next topic</Link></Button> : <Button asChild size="sm" variant="secondary"><Link to="/my-path">Continue path</Link></Button>}
          </div>
        </Panel>
      ) : null}

      <AnnotationPanel
        target={{ kind: "lab", id: lab.id, label: lab.title, href: "/labs" }}
        title="Lab notes and bookmark"
        description="Notes and bookmarks for this lab, saved with everything else you have marked."
      />

      {history.length > 1 ? (
        <Panel title={`Attempt history (${history.length})`}>
          <ul className="divide-y divide-border">{history.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{new Date(item.createdAt).toLocaleString()}</span><span>{learnerStatusLabel(item.status)} · {item.score}/{item.maxScore}</span></li>)}</ul>
        </Panel>
      ) : null}
    </div>
  );
}