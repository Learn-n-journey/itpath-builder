import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock3,
  FileText,
  FlaskConical,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { ProGate } from "@/components/pro-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { labs, topics } from "@/data/static-content";
import type { Lab, LabAttempt } from "@/lib/app-data/types";
import { projectFromLabAttempt } from "@/lib/portfolio-engine";
import { shuffleWithSeed, useShuffleSeed } from "@/lib/shuffle";
import { useAppState } from "@/state/app-state";
import { adaptivePath } from "@/lib/adaptive-path";

export const Route = createFileRoute("/labs")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { lab?: string } =>
    typeof search['lab'] === "string" && search['lab'] ? { lab: search['lab'] } : {},
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Hands-on IT Labs | IT PATH" },
      { name: "description", content: "Complete guided practical IT labs with saved evidence and review." },
      { property: "og:title", content: "Hands-on IT Labs | IT PATH" },
      { property: "og:description", content: "Guided hardware, systems, networking, security, and cloud exercises." },
    ],
  }),
  component: LabsPageGated,
});

function LabsPageGated() {
  return (
    <ProGate feature="Hands-on labs">
      <LabsPage />
    </ProGate>
  );
}

const statusLabels = {
  in_progress: "In Progress",
  completed: "Completed",
  needs_review: "Needs Review",
  mastered: "Mastered",
} as const;

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

function LabsPage() {
  const { user } = useAppState();
  const focus = useMemo(() => adaptivePath(user), [user]);
  const [seed, reshuffle] = useShuffleSeed();
  const [selectedId, setSelectedId] = useState("");
  const shuffled = useMemo(() => {
    const focusIds = new Set(focus.topics.map((topic) => topic.id));
    return shuffleWithSeed(labs, seed).sort((a, b) => Number(focusIds.has(b.topicId)) - Number(focusIds.has(a.topicId)));
  }, [focus.topics, seed]);
  const lab = shuffled.find((item) => item.id === selectedId) ?? shuffled[0];
  const attempts = user.labAttempts;
  const latest = lab ? attempts.find((attempt) => attempt.labId === lab.id) : undefined;

  return (
    <>
      <PageHeader
        title="Labs"
        description="Guided practical work you perform in an environment you control, shown in a random order. IT PATH records your evidence but never claims to access that environment."
        actions={
          <Button variant="outline" onClick={() => { reshuffle(); setSelectedId(""); }}>
            <RefreshCw /> Shuffle
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Available" value={labs.length} />
        <StatCard label="In progress" value={attempts.filter((item) => item.status === "in_progress").length} />
        <StatCard label="Needs review" value={attempts.filter((item) => item.status === "needs_review").length} />
        <StatCard label="Completed" value={attempts.filter((item) => item.status === "completed" || item.status === "mastered").length} />
      </div>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Panel
          title="Lab library"
          description={`${labs.length} practical exercises across core IT disciplines, with a walkthrough and a fault-diagnosis drill for every topic.`}
        >
          <div className="space-y-2">
            {shuffled.map((item) => {
              const itemAttempt = attempts.find((attempt) => attempt.labId === item.id);
              return (
                <Button
                  key={item.id}
                  variant={item.id === lab?.id ? "secondary" : "ghost"}
                  className="h-auto w-full justify-start whitespace-normal px-3 py-3 text-left"
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-primary">{categoryLabels[item.category]}</span>
                    <span className="mt-1 block">{item.title}</span>
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {itemAttempt ? statusLabels[itemAttempt.status] : "Not Started"}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </Panel>
        {lab ? (
          <LabWorkspace key={lab.id} lab={lab} {...(latest ? { latestAttempt: latest } : {})} />
        ) : null}
      </div>
    </>
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
    toast.success(complete ? "Lab completed and added to Portfolio." : "Lab submitted for review.");
  }

  function markMastered() {
    if (!attempt || attempt.status !== "completed" || attempt.score < lab.masteryScore) return;
    update({ status: "mastered", reviewedAt: new Date().toISOString(), masteredAt: new Date().toISOString() });
    setShowReview(true);
    toast.success("Lab marked mastered after review.");
  }

  return (
    <div className="space-y-5">
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
          <Badge variant="outline"><Clock3 /> {lab.estimatedMinutes} min</Badge>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
          <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Environment</dt><dd className="mt-1 text-sm">{lab.environment}</dd></div>
          <div><dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expected result</dt><dd className="mt-1 text-sm">{lab.expectedResult}</dd></div>
        </dl>
      </Panel>

      <Panel title="Prerequisites">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{lab.prerequisites.map((item) => <li key={item}>{item}</li>)}</ul>
      </Panel>
      <Panel title="Instructions" description="Perform these steps yourself in the stated environment. IT PATH does not execute or verify external commands.">
        <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">{lab.instructions.map((item) => <li key={item}>{item}</li>)}</ol>
      </Panel>

      {!attempt ? (
        <Panel title="Ready to begin" description="Viewing this lab has not changed your progress.">
          <Button onClick={start}><FlaskConical /> Start lab</Button>
        </Panel>
      ) : (
        <>
          <Panel title="Checklist" description="Confirm only steps you personally completed and verified.">
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

          <Panel title="Reflection" description={lab.reflectionPrompt}>
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
            <Badge>{statusLabels[attempt.status]}</Badge>
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

      <AnnotationPanel
        target={{ kind: "lab", id: lab.id, label: lab.title, href: "/labs" }}
        title="Lab notes and bookmark"
        description="Notes and bookmarks for this lab, saved with everything else you have marked."
      />

      {history.length > 1 ? (
        <Panel title={`Attempt history (${history.length})`}>
          <ul className="divide-y divide-border">{history.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{new Date(item.createdAt).toLocaleString()}</span><span>{statusLabels[item.status]} · {item.score}/{item.maxScore}</span></li>)}</ul>
        </Panel>
      ) : null}
    </div>
  );
}