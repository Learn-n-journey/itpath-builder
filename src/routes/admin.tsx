import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BetaAccessPanel } from "@/components/beta-access-panel";
import { LearningPathsPanel } from "@/components/learning-paths-panel";
import { SiteEngagementPanel } from "@/components/site-engagement-panel";
import { SystemDiagnostics } from "@/components/system-diagnostics";
import { SpreadsheetSyncPanel } from "@/components/owner/spreadsheet-sync-panel";
import { MaintenancePanel } from "@/components/owner/maintenance-panel";
import { coursePack } from "@/content/course-pack";
import { contentHealth, type TopicHealth } from "@/lib/admin/content-health";
import { courseCoverage, coverageCsv } from "@/lib/admin/concept-coverage";
import { engineHealthChecks } from "@/lib/admin/engine-health";
import { runQualityCheckerChallenge, type QualityChallengeResult } from "@/lib/admin/quality-challenge";
import { checkTarget } from "@/lib/admin/check-link";
import { areaHealth, buildOverview, filterChecks, stateLabel, type HealthFilter } from "@/lib/admin/health-state";
import type { ActivityEntry, ContentVersion, FlowCounter, HealthCheck, HealthState } from "@/lib/admin/types";
import { canRollback, lifecycleLabel } from "@/lib/admin/release";
import {
  advanceVersion,
  applyTopicFactCorrection,
  factualQualityChallenge,
  verifyImportedTopicFacts,
  flowHealth,
  importHealth,
  lastHealthRuns,
  listActivity,
  listVersions,
  recordHealthRun,
  rollbackVersion,
  sourceHealth,
  systemHealth,
  type SourceHealthRow,
  type FactualChallengeResult,
  type TopicFactualVerification,
} from "@/lib/admin.functions";
import { runContentAudit } from "@/lib/quality/audit";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { useAuth } from "@/state/auth-state";

export const Route = createFileRoute("/admin")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Control room | IT PATH" },
      { name: "description", content: "Owner-only health checks, content release gate and activity log for IT PATH." },
      { property: "og:title", content: "Control room | IT PATH" },
      { property: "og:description", content: "Owner-only health checks, content release gate and activity log for IT PATH." },
    ],
  }),
  component: AdminPage,
});

const TONE: Record<HealthState, string> = {
  healthy: "text-success",
  warning: "text-warning",
  failed: "text-destructive",
  unknown: "text-muted-foreground",
};
const DOT: Record<HealthState, string> = {
  healthy: "bg-success",
  warning: "bg-warning",
  failed: "bg-destructive",
  unknown: "bg-muted-foreground/50",
};

function shortTime(iso: string | null | undefined): string {
  if (!iso) return "Never checked";
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function StateChip({ state }: { state: HealthState }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${TONE[state]}`}>
      <span className={`size-1.5 rounded-full ${DOT[state]}`} aria-hidden />
      {stateLabel(state)}
    </span>
  );
}

function AnswerCard({ question, state }: { question: string; state: HealthState; note: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2">
      <p className="truncate text-sm">{question}</p>
      <StateChip state={state} />
    </div>
  );
}

/** Lets a finding send the owner to another tab of this same screen. */
const JumpToTab = createContext<((tab: string) => void) | null>(null);

function CheckAction({ check }: { check: HealthCheck }) {
  const jump = useContext(JumpToTab);
  const target = checkTarget(check);
  if (!target) return null;
  const cls = "shrink-0 text-sm font-medium text-primary hover:underline";
  return target.tab ? (
    <button type="button" className={cls} onClick={() => jump?.(target.tab as string)}>
      {target.label} →
    </button>
  ) : (
    <a className={cls} href={target.href} {...(target.external ? { target: "_blank", rel: "noreferrer" } : {})}>
      {target.label} →
    </a>
  );
}

function CheckRow({ check }: { check: HealthCheck }) {
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(check.detail || check.affects || check.action || check.lastRunAt);
  return (
    <li className="py-2.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <span className={`mt-1.5 size-2 rounded-full ${DOT[check.state]}`} aria-label={stateLabel(check.state)} />
        <button
          type="button"
          className="min-w-0 text-left"
          aria-expanded={open}
          onClick={() => hasDetail && setOpen((value) => !value)}
        >
          <span className="block text-sm">{check.label}</span>
          {check.state !== "healthy" && check.affects ? <span className="block truncate text-xs text-muted-foreground">{check.affects}</span> : null}
        </button>
        {check.state === "healthy" ? null : <CheckAction check={check} />}
      </div>
      {open ? (
        <div className="ml-5 mt-2 space-y-1 border-l border-border/60 pl-3 text-xs text-muted-foreground">
          {check.detail ? <p>{check.detail}</p> : null}
          {check.state !== "healthy" && check.affects ? <p>Affects: {check.affects}</p> : null}
          {check.state !== "healthy" && check.action ? <p className="text-foreground/90">Fix: {check.action}</p> : null}
          {check.lastRunAt ? <p>Checked {new Date(check.lastRunAt).toLocaleString()}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

function AreaRow({ area }: { area: { area: string; state: HealthState; lastRunAt: string | null; checks: HealthCheck[] } }) {
  const [open, setOpen] = useState(false);
  const issues = area.checks.filter((check) => check.state !== "healthy");
  return (
    <li>
      <button
        type="button"
        className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate text-sm font-medium capitalize">
          {area.area}
          {issues.length > 0 ? <span className="ml-2 text-xs font-normal text-muted-foreground">{issues.length} issue{issues.length === 1 ? "" : "s"}</span> : null}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">{shortTime(area.lastRunAt)}</span>
        <StateChip state={area.state} />
      </button>
      {open && area.checks.length > 0 ? (
        <ul className="mb-2 divide-y divide-border/40 pl-3">
          {(issues.length > 0 ? issues : area.checks).map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ActivityRow({ entry }: { entry: ActivityEntry }) {
  const [open, setOpen] = useState(false);
  const details = Object.entries(entry.detail);
  const findings = details.find(([key]) => /finding|failed|warning|blocking|count/i.test(key));
  const bad = /fail|block|reject|error/i.test(entry.result);
  const warn = /warn|review/i.test(entry.result);
  return (
    <li>
      <button
        type="button"
        className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-baseline gap-3 py-2 text-left"
        onClick={() => details.length > 0 && setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{shortTime(entry.createdAt)}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm">{entry.action}{entry.subject ? ` · ${entry.subject}` : ""}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {entry.area}{findings ? ` · ${findings[0]} ${String(findings[1])}` : ""}
          </span>
        </span>
        <span className={`text-xs ${bad ? "text-destructive" : warn ? "text-warning" : "text-muted-foreground"}`}>{entry.result}</span>
      </button>
      {open ? (
        <p className="mb-2 ml-[5.25rem] text-xs text-muted-foreground">
          {new Date(entry.createdAt).toLocaleString()} · {details.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}
        </p>
      ) : null}
    </li>
  );
}

const FILTERS: { id: HealthFilter; label: string }[] = [
  { id: "review", label: "Needs review" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warnings" },
  { id: "unknown", label: "Not yet checked" },
  { id: "healthy", label: "Healthy" },
  { id: "all", label: "Everything" },
];

function AdminPage() {
  const { email } = useAuth();
  const isOwner = OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());

  const runSystem = useServerFn(systemHealth);
  const runFactualChallenge = useServerFn(factualQualityChallenge);
  const runTopicFactCheck = useServerFn(verifyImportedTopicFacts);
  const applyFactCorrection = useServerFn(applyTopicFactCorrection);
  const readRuns = useServerFn(lastHealthRuns);
  const saveRun = useServerFn(recordHealthRun);
  const readSources = useServerFn(sourceHealth);
  const readImports = useServerFn(importHealth);
  const readFlows = useServerFn(flowHealth);
  const readActivity = useServerFn(listActivity);
  const readVersions = useServerFn(listVersions);
  const advance = useServerFn(advanceVersion);
  const rollback = useServerFn(rollbackVersion);

  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const jumpToTab = useCallback((next: string) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const [filter, setFilter] = useState<HealthFilter>("review");
  const [topicFilter, setTopicFilter] = useState("");

  const [systemChecks, setSystemChecks] = useState<HealthCheck[] | null>(null);
  const [systemRanAt, setSystemRanAt] = useState<string | null>(null);
  const [contentReport, setContentReport] = useState<TopicHealth[] | null>(null);
  const [contentRanAt, setContentRanAt] = useState<string | null>(null);
  const [engineChecks, setEngineChecks] = useState<HealthCheck[] | null>(null);
  const [engineRanAt, setEngineRanAt] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceHealthRow[] | null>(null);
  const [imports, setImports] = useState<Awaited<ReturnType<typeof importHealth>> | null>(null);
  const [flows, setFlows] = useState<FlowCounter[] | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [qualityChallenge, setQualityChallenge] = useState<QualityChallengeResult[] | null>(null);
  const [factualChallenge, setFactualChallenge] = useState<FactualChallengeResult[] | null>(null);
  const [topicFactChecks, setTopicFactChecks] = useState<Record<string, TopicFactualVerification>>({});
  const [checkingTopicFacts, setCheckingTopicFacts] = useState<string | null>(null);
  const [checkingAllFacts, setCheckingAllFacts] = useState(false);
  const [fixingFact, setFixingFact] = useState<string | null>(null);
  const [workbookTopic, setWorkbookTopic] = useState("");

  // What was checked before, so "not yet checked" stays honest across visits.
  useEffect(() => {
    if (!isOwner) return;
    void (async () => {
      try {
        const [runs, activityReply, versionReply] = await Promise.all([
          readRuns({}),
          readActivity({ data: {} }),
          readVersions({ data: {} }),
        ]);
        for (const run of runs.runs) {
          if (run.area === "system") {
            setSystemRanAt(run.finishedAt);
            setSystemChecks(run.checks);
          }
          if (run.area === "content") setContentRanAt(run.finishedAt);
          if (run.area === "engine") {
            setEngineRanAt(run.finishedAt);
            setEngineChecks(run.checks);
          }
        }
        setActivity(activityReply.entries);
        setVersions(versionReply.versions);
      } catch {
        /* the dashboard still works without history */
      }
    })();
  }, [isOwner, readActivity, readRuns, readVersions]);

  const refreshActivity = useCallback(async () => {
    try {
      setActivity((await readActivity({ data: {} })).entries);
    } catch {
      /* log is informational */
    }
  }, [readActivity]);

  const checkSystem = useCallback(async () => {
    const started = Date.now();
    const reply = await runSystem({});
    if (!reply.owner) throw new Error("Only the owner can run these checks.");
    setSystemChecks(reply.checks);
    setSystemRanAt(reply.ranAt);
    await saveRun({
      data: {
        area: "system",
        state: reply.checks.some((check) => check.state === "failed") ? "failed" : "healthy",
        checks: reply.checks,
        durationMs: Date.now() - started,
        summary: { checks: reply.checks.length },
      },
    });
    return reply.checks;
  }, [runSystem, saveRun]);

  const checkContent = useCallback(async () => {
    const started = Date.now();
    // The existing deterministic audit stays authoritative for what it covers.
    const audit = runContentAudit();
    const ranAt = new Date().toISOString();
    const report = contentHealth(coursePack, { findings: audit.findings, ranAt });
    setContentReport(report);
    setContentRanAt(ranAt);
    const failing = report.flatMap((topic) => topic.checks).filter((check) => check.state !== "healthy");
    await saveRun({
      data: {
        area: "content",
        state: report.some((topic) => topic.state === "failed") ? "failed" : failing.length > 0 ? "warning" : "healthy",
        checks: failing,
        durationMs: Date.now() - started,
        summary: { topics: report.length, blocking: audit.blocking, warnings: audit.warnings },
      },
    });
    return report;
  }, [saveRun]);

  const verifyTopicFacts = useCallback(async (topicId: string) => {
    setCheckingTopicFacts(topicId);
    try {
      const reply = await runTopicFactCheck({ data: { topicId } });
      if (!reply.owner) throw new Error("Only the owner can run factual verification.");
      setTopicFactChecks((current) => ({ ...current, [topicId]: reply }));
      if (reply.error && reply.findings.length === 0) toast.error(reply.error);
      else if (reply.findings.length > 0) toast.warning(`${reply.findings.length} factual finding${reply.findings.length === 1 ? "" : "s"} need review.`);
      else toast.success("No factual errors were found in the imported lesson.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Factual verification could not finish.");
    } finally {
      setCheckingTopicFacts(null);
    }
  }, [runTopicFactCheck]);

  const verifyAllWorkbookFacts = useCallback(async () => {
    const ids = coursePack.sections.map((topic) => topic.id);
    setCheckingAllFacts(true);
    let findings = 0;
    try {
      for (const topicId of ids) {
        setCheckingTopicFacts(topicId);
        const reply = await runTopicFactCheck({ data: { topicId } });
        if (!reply.owner) throw new Error("Only the owner can run factual verification.");
        setTopicFactChecks((current) => ({ ...current, [topicId]: reply }));
        findings += reply.findings.length;
      }
      toast[findings ? "warning" : "success"](findings ? `Checked ${ids.length} workbooks · ${findings} factual finding${findings === 1 ? "" : "s"} need review.` : `Checked ${ids.length} workbooks · no factual errors found.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Workbook verification could not finish.");
    } finally { setCheckingTopicFacts(null); setCheckingAllFacts(false); }
  }, [runTopicFactCheck]);

  const fixAdminFact = useCallback(async (topicId: string, index: number) => {
    const finding = topicFactChecks[topicId]?.findings[index];
    if (!finding?.correction) return;
    if (!window.confirm(`Apply this correction to the source workbook?\n\nFLAGGED:\n${finding.claim}\n\nREPLACEMENT:\n${finding.correction}`)) return;
    const key = `${topicId}:${index}`; setFixingFact(key);
    try {
      const result = await applyFactCorrection({ data: { topicId, claim: finding.claim, correction: finding.correction } });
      if (!result.ok) throw new Error(result.error ?? "The workbook could not be updated.");
      const checked = await runTopicFactCheck({ data: { topicId } });
      setTopicFactChecks((current) => ({ ...current, [topicId]: checked }));
      toast.success(`Fixed in ${result.sourceFile} → ${result.sheet} ${result.cell} and rechecked.`);
    } catch (error) { toast.error(error instanceof Error ? error.message : "The workbook could not be updated."); }
    finally { setFixingFact(null); }
  }, [applyFactCorrection, runTopicFactCheck, topicFactChecks]);

  const challengeFactualAccuracy = useCallback(async () => {
    const reply = await runFactualChallenge({});
    if (!reply.owner) throw new Error("Only the owner can run this challenge.");
    setFactualChallenge(reply.results);
    const caught = reply.results.filter((item) => item.detected).length;
    if (reply.results.length > 0 && caught === reply.results.length) {
      toast.success(`Factual verifier caught all ${caught} injected errors. Live content was unchanged.`);
    } else {
      toast.error(`Factual verifier caught ${caught} of ${reply.results.length} injected errors.`);
    }
    return reply.results;
  }, [runFactualChallenge]);

  const challengeQualityChecker = useCallback(async () => {
    const results = runQualityCheckerChallenge(coursePack);
    setQualityChallenge(results);
    const caught = results.filter((item) => item.detected).length;
    if (results.length > 0 && caught === results.length) {
      toast.success(`Quality checker caught all ${caught} injected defects. Live content was unchanged.`);
    } else {
      toast.error(`Quality checker caught ${caught} of ${results.length} injected defects.`);
    }
    return results;
  }, []);

  const downloadCoverageGaps = useCallback(() => {
    const report = courseCoverage(coursePack);
    if (report.findings.length === 0) {
      toast.success(`All ${report.pass} questions test knowledge the course teaches.`);
      return;
    }
    const blob = new Blob([coverageCsv(report.findings)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quiz-concept-coverage-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${report.pass} pass · ${report.review} to review · ${report.fail} not taught.`);
  }, []);


  const checkEngine = useCallback(async () => {
    const started = Date.now();
    const ranAt = new Date().toISOString();
    // Pure reads of the course material: no learner record is touched.
    const checks = engineHealthChecks(coursePack, ranAt);
    setEngineChecks(checks);
    setEngineRanAt(ranAt);
    await saveRun({
      data: {
        area: "engine",
        state: checks.some((check) => check.state === "failed") ? "failed" : "healthy",
        checks: checks.filter((check) => check.state !== "healthy"),
        durationMs: Date.now() - started,
        summary: { checks: checks.length },
      },
    });
    return checks;
  }, [saveRun]);

  const loadSupporting = useCallback(async () => {
    const [sourceReply, importReply, flowReply] = await Promise.all([
      readSources({}),
      readImports({}),
      readFlows({}),
    ]);
    setSources(sourceReply.rows);
    setImports(importReply);
    setFlows(flowReply.counters);
  }, [readFlows, readImports, readSources]);

  async function run(label: string, job: () => Promise<unknown>) {
    setBusy(label);
    try {
      await job();
      toast.success(`${label} finished.`);
      await refreshActivity();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${label} could not finish.`);
    } finally {
      setBusy(null);
    }
  }

  const sourceChecks = useMemo<HealthCheck[]>(() => {
    if (!sources) return [];
    const broken = sources.filter((row) => !row.ok);
    return [
      {
        id: "sources:links",
        area: "sources",
        label: "Outside reading and video links",
        state: broken.length === 0 ? "healthy" : broken.length > 5 ? "failed" : "warning",
        detail:
          broken.length === 0
            ? `${sources.length} link${sources.length === 1 ? "" : "s"} answered last time they were checked.`
            : `${broken.length} link${broken.length === 1 ? "" : "s"} did not answer: ${broken.slice(0, 3).map((row) => row.label ?? row.url).join(", ")}`,
        affects: "Learners following the source cannot reach it.",
        action: "Review each failing link and approve a replacement yourself. Sources are never swapped automatically.",
        lastRunAt: sources[0]?.checkedAt ?? null,
        ...(broken[0] ? { link: broken[0].url, linkLabel: "Open the first failing link" } : {}),
      },
    ];
  }, [sources]);

  const importChecks = useMemo<HealthCheck[]>(() => {
    if (!imports) return [];
    const stale = imports.lastSyncAt ? Date.now() - new Date(imports.lastSyncAt).getTime() > 3 * 24 * 60 * 60 * 1000 : true;
    const withoutHash = imports.lessons.filter((lesson) => !lesson.hash).length;
    return [
      {
        id: "imports:recency",
        area: "imports",
        label: "Recent imports",
        state: imports.lastSyncAt ? (stale ? "warning" : "healthy") : "unknown",
        detail: imports.lastSyncAt
          ? `Last workbook came in ${new Date(imports.lastSyncAt).toLocaleString()}.`
          : "No import recorded yet.",
        affects: "Live lessons and questions may be older than your spreadsheets.",
        action: "Run a sync from the Imports tab.",
        lastRunAt: imports.lastSyncAt,
      },
      {
        // Older lessons imported before fingerprinting are not a fault: they
        // still work, change detection just falls back to the date. This is
        // reported for information and never counts as a warning.
        id: "imports:versioned",
        area: "imports",
        label: "Version fingerprints",
        state: "healthy",
        detail:
          withoutHash === 0
            ? "Every imported lesson carries a fingerprint, so changes are detected by content."
            : `${withoutHash} lesson${withoutHash === 1 ? "" : "s"} came in before fingerprints, so changes to those are spotted by date instead. Nothing to fix.`,
        affects: "",
        action: "Nothing to do.",
        lastRunAt: imports.lastSyncAt,
      },
    ];
  }, [imports]);

  const flowChecks = useMemo<HealthCheck[]>(() => {
    if (!flows) return [];
    if (flows.length === 0) {
      return [
        {
          id: "flows:none",
          area: "flows",
          label: "Everyday journeys",
          state: "unknown",
          detail: "No journey results have been recorded yet.",
          affects: "",
          action: "Nothing to do; counts appear as people use the app.",
          lastRunAt: null,
        },
      ];
    }
    const byFlow = new Map<string, { ok: number; failed: number; slow: number }>();
    for (const counter of flows) {
      const current = byFlow.get(counter.flow) ?? { ok: 0, failed: 0, slow: 0 };
      if (counter.outcome === "ok") current.ok += counter.count;
      else current.failed += counter.count;
      current.slow += counter.slowCount;
      byFlow.set(counter.flow, current);
    }
    return [...byFlow.entries()].map(([flow, counts]) => {
      const total = counts.ok + counts.failed;
      const rate = total === 0 ? 0 : counts.failed / total;
      return {
        id: `flows:${flow}`,
        area: "flows",
        label: flow,
        state: rate > 0.1 ? "failed" : rate > 0.02 || counts.slow > 0 ? "warning" : "healthy",
        detail: `${total} attempt${total === 1 ? "" : "s"} in the last two weeks · ${counts.failed} failed · ${counts.slow} slow.`,
        affects: "Learners hitting this step see an error or a long wait.",
        action: "Open the failing area's checks and look at recent errors.",
        lastRunAt: flows[0]?.day ?? null,
      } satisfies HealthCheck;
    });
  }, [flows]);

  const contentChecks = useMemo(() => (contentReport ?? []).flatMap((topic) => topic.checks), [contentReport]);

  const areas = useMemo(
    () => [
      areaHealth("system", systemChecks ?? [], systemRanAt),
      areaHealth("performance", systemChecks ?? [], systemRanAt),
      areaHealth("content", contentChecks, contentRanAt),
      areaHealth("engine", engineChecks ?? [], engineRanAt),
      areaHealth("sources", sourceChecks, sources?.[0]?.checkedAt ?? null),
      areaHealth("imports", importChecks, imports?.lastSyncAt ?? null),
      areaHealth("flows", flowChecks, flows?.[0]?.day ?? null),
    ],
    [contentChecks, contentRanAt, engineChecks, engineRanAt, flowChecks, flows, importChecks, imports, sourceChecks, sources, systemChecks, systemRanAt],
  );

  const overview = useMemo(() => buildOverview(areas), [areas]);
  const allChecks = useMemo(() => areas.flatMap((area) => area.checks), [areas]);
  const shown = useMemo(
    () => filterChecks(allChecks, topicFilter ? { filter, topicId: topicFilter } : { filter }),
    [allChecks, filter, topicFilter],
  );

  async function runEverything() {
    await run("Full health check", async () => {
      await Promise.all([checkSystem(), loadSupporting()]);
      await checkContent();
      await checkEngine();
    });
  }

  async function handleAdvance(version: ContentVersion, action: "preview" | "approve" | "publish" | "reject") {
    setBusy(action);
    try {
      const reply = await advance({ data: { versionId: version.id, action } });
      if (!reply.ok) {
        toast.error(reply.error ?? "That step was blocked.");
      } else {
        toast.success(`${version.topicId} ${version.kind}: ${action}d.`);
      }
      setVersions((await readVersions({ data: {} })).versions);
      await refreshActivity();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That step could not be taken.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRollback(version: ContentVersion) {
    setBusy("rollback");
    try {
      const reply = await rollback({ data: { topicId: version.topicId, kind: version.kind, confirm: true } });
      if (!reply.ok) toast.error(reply.error ?? "Nothing was rolled back.");
      else toast.success("The previous version is live again.");
      setVersions((await readVersions({ data: {} })).versions);
      await refreshActivity();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The rollback did not go through.");
    } finally {
      setBusy(null);
    }
  }

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PageHeader title="Control room" description="This area is for the site owner." />
        <Panel title="Not available">
          <p className="text-sm text-muted-foreground">
            You need to be signed in as the owner to open this page.
          </p>
          <Button asChild className="mt-3">
            <Link to="/dashboard">Back to your dashboard</Link>
          </Button>
        </Panel>
      </div>
    );
  }

  const liveByTopic = new Map<string, ContentVersion>();
  for (const version of versions) if (version.status === "live") liveByTopic.set(`${version.topicId}:${version.kind}`, version);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader title="Control room" />

      <div className="divide-y divide-border/60 border-y border-border/60">
        <AnswerCard question="Is IT PATH working?" state={overview.working} note="Services and speed" />
        <AnswerCard question="Is the content healthy?" state={overview.content} note="Topics and imports" />
        <AnswerCard question="Is anything blocking learners?" state={overview.blocking} note="Engine, content, services" />
        <AnswerCard question="Does anything need me?" state={overview.attention} note="Across every area" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={runEverything} disabled={busy !== null}>
          {busy === "Full health check" ? "Checking…" : "Run full health check"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {overview.lastRunAt ? `Last checked ${shortTime(overview.lastRunAt)}` : "Not yet checked"}
        </span>
      </div>

      <JumpToTab.Provider value={jumpToTab}>
      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto whitespace-nowrap bg-transparent p-0 [scrollbar-width:none]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="imports">Imports</TabsTrigger>
          <TabsTrigger value="releases">Releases</TabsTrigger>
          <TabsTrigger value="engine">Engine</TabsTrigger>
          <TabsTrigger value="log">Activity</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <section className="mt-5">
            <h2 className="font-display text-lg font-semibold">Areas</h2>
            <ul className="mt-2 divide-y divide-border/60">
              {areas
                .filter((area) => area.area !== "performance")
                .map((area) => (
                  <AreaRow key={area.area} area={area} />
                ))}
            </ul>
          </section>
          <Panel className="mt-6" title="What needs attention">
            <div className="-mx-1 flex gap-1 overflow-x-auto whitespace-nowrap px-1 [scrollbar-width:none]">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`h-8 shrink-0 rounded-md px-3 text-sm ${filter === item.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Input
              className="mt-2 h-9"
              value={topicFilter}
              placeholder="Filter by topic id"
              onChange={(event) => setTopicFilter(event.target.value.trim())}
            />
            <ul className="mt-2 divide-y divide-border/60">
              {shown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing here.
                </p>
              ) : (
                shown.slice(0, 120).map((check) => <CheckRow key={check.id} check={check} />)
              )}
            </ul>
          </Panel>

        </TabsContent>

        <TabsContent value="content">
          <Panel className="mt-6" title="Spreadsheet factual checker">
            <p className="text-sm text-muted-foreground">Check any imported lesson workbook here, or run the same factual verifier across every topic without opening them one by one.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select value={workbookTopic} onChange={(e)=>setWorkbookTopic(e.target.value)} className="h-10 min-w-[16rem] rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select a workbook…</option>
                {coursePack.sections.map((topic)=><option key={topic.id} value={topic.id}>{topic.title}</option>)}
              </select>
              <Button variant="outline" disabled={!workbookTopic || checkingTopicFacts!==null || checkingAllFacts} onClick={()=>void verifyTopicFacts(workbookTopic)}>Check selected workbook</Button>
              <Button disabled={checkingAllFacts || checkingTopicFacts!==null} onClick={()=>void verifyAllWorkbookFacts()}>{checkingAllFacts ? `Checking… ${checkingTopicFacts ?? ""}` : "Check all workbooks"}</Button>
            </div>
            {Object.keys(topicFactChecks).length ? <div className="mt-4 space-y-3">{Object.entries(topicFactChecks).filter(([id])=>!workbookTopic || id===workbookTopic).map(([topicId,result])=><div key={topicId} className="rounded-lg border border-border/60 p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{coursePack.sections.find((topic)=>topic.id===topicId)?.title ?? topicId}</p><span className={`text-xs font-medium ${result.findings.length ? "text-warning" : "text-success"}`}>{result.findings.length ? `${result.findings.length} TO REVIEW` : result.error ? "INCOMPLETE" : "NO ERRORS FOUND"}</span></div>{result.sourceFile?<p className="mt-1 text-[11px] text-muted-foreground">{result.sourceFile}</p>:null}{result.error?<p className="mt-2 text-xs text-warning">{result.error}</p>:null}{result.findings.map((finding,index)=><div key={index} className="mt-3 border-t border-border/40 pt-3 text-xs"><p className="font-medium">Flagged: {finding.claim}</p><p className="mt-1 text-muted-foreground">Why: {finding.problem}</p>{finding.correction?<><p className="mt-1 text-muted-foreground">Correction: {finding.correction}</p><Button size="sm" variant="outline" className="mt-2" disabled={fixingFact!==null || checkingAllFacts} onClick={()=>void fixAdminFact(topicId,index)}>{fixingFact===`${topicId}:${index}`?"Fixing…":"Fix it"}</Button></>:null}</div>)}</div>)}</div>:null}
          </Panel>
          <Panel className="mt-6" title="Topic health">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => run("Content check", checkContent)} disabled={busy !== null}>
                {busy === "Content check" ? "Checking…" : "Check all topics"}
              </Button>
              <Button variant="outline" onClick={downloadCoverageGaps}>
                Download coverage report
              </Button>
              <Button variant="outline" onClick={() => run("QA challenge", challengeQualityChecker)} disabled={busy !== null}>
                {busy === "QA challenge" ? "Challenging…" : "Challenge quality checker"}
              </Button>
              <Button variant="outline" onClick={() => run("Factual challenge", challengeFactualAccuracy)} disabled={busy !== null}>
                {busy === "Factual challenge" ? "Fact-checking…" : "Challenge factual accuracy"}
              </Button>
            </div>

            {factualChallenge ? (
              <div className="mt-4 rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Blind factual accuracy challenge</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Known false statements are sent to the production factual-verification layer without revealing what was changed. Test data only; live content is unchanged.
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {factualChallenge.filter((item) => item.detected).length} / {factualChallenge.length} caught
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-border/40">
                  {factualChallenge.map((item) => (
                    <li key={item.id} className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium">{item.label}</p>
                        <span className={`text-xs font-medium ${item.detected ? "text-success" : "text-destructive"}`}>
                          {item.detected ? "CAUGHT" : "MISSED"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Injected: {item.injected}</p>
                      {item.issues.length > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">Verifier: {item.issues.join(" ")}</p>
                      ) : null}
                      {item.corrected ? <p className="mt-1 text-xs text-muted-foreground">Correction: {item.corrected}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {qualityChallenge ? (
              <div className="mt-4 rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Controlled defect challenge</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Temporary in-memory mutations only. Live course content, spreadsheets, learner records and Supabase are unchanged.
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {qualityChallenge.filter((item) => item.detected).length} / {qualityChallenge.length} caught
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-border/40">
                  {qualityChallenge.map((item) => (
                    <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm">{item.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                      <span className={`text-xs font-medium ${item.detected ? "text-success" : "text-destructive"}`}>
                        {item.detected ? "CAUGHT" : "MISSED"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {contentReport === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet checked.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border/60">
                {contentReport
                  .filter((topic) => (filter === "healthy" ? topic.state === "healthy" : topic.state !== "healthy"))
                  .map((topic) => (
                    <li key={topic.topicId} className="py-3">
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-2 text-left"
                        onClick={() => setOpenTopic(openTopic === topic.topicId ? null : topic.topicId)}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{topic.title}</span>
                          <span className="block text-xs text-muted-foreground">
                            {topic.failed} failed · {topic.warnings} warning{topic.warnings === 1 ? "" : "s"}
                          </span>
                        </span>
                        <StateChip state={topic.state} />
                      </button>
                      {openTopic === topic.topicId ? (
                        <div className="mt-2 pl-3">
                          <div className="mb-3 rounded-lg border border-border/60 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">Factual accuracy</p>
                                <p className="text-xs text-muted-foreground">Owner-only review of the actual approved lesson imported from this topic's spreadsheet.</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={checkingTopicFacts !== null}
                                onClick={() => void verifyTopicFacts(topic.topicId)}
                              >
                                {checkingTopicFacts === topic.topicId ? "Verifying…" : topicFactChecks[topic.topicId] ? "Verify again" : "Verify factual accuracy"}
                              </Button>
                            </div>
                            {topicFactChecks[topic.topicId] ? (
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground">
                                  {topicFactChecks[topic.topicId]!.sourceFile ? `Imported file: ${topicFactChecks[topic.topicId]!.sourceFile} · ` : ""}
                                  {topicFactChecks[topic.topicId]!.findings.length === 0 && !topicFactChecks[topic.topicId]!.error
                                    ? "No factual errors found."
                                    : `${topicFactChecks[topic.topicId]!.findings.length} finding${topicFactChecks[topic.topicId]!.findings.length === 1 ? "" : "s"} need review.`}
                                </p>
                                {topicFactChecks[topic.topicId]!.error ? (
                                  <p className="mt-1 text-xs text-warning">{topicFactChecks[topic.topicId]!.error}</p>
                                ) : null}
                                {topicFactChecks[topic.topicId]!.findings.length > 0 ? (
                                  <ul className="mt-2 divide-y divide-border/40">
                                    {topicFactChecks[topic.topicId]!.findings.map((finding, index) => (
                                      <li key={`${topic.topicId}-fact-${index}`} className="py-2">
                                        <p className="text-xs font-medium">Flagged: {finding.claim}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Why: {finding.problem}</p>
                                        {finding.correction ? <p className="mt-1 text-xs text-muted-foreground">Correction: {finding.correction}</p> : null}
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                                <p className="mt-2 text-[11px] text-muted-foreground">Advisory only. This check never edits the lesson automatically.</p>
                              </div>
                            ) : null}
                          </div>
                          <ul className="divide-y divide-border/40">
                            {topic.checks.map((check) => (
                              <CheckRow key={check.id} check={check} />
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="sources">
          <Panel className="mt-6" title="Reading and video sources">
            <Button onClick={() => run("Source check", loadSupporting)} disabled={busy !== null}>
              {busy === "Source check" ? "Loading…" : "Load latest results"}
            </Button>
            {sources === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet loaded.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border/60">
                {sources.filter((row) => !row.ok).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Every checked source answered.</p>
                ) : (
                  sources
                    .filter((row) => !row.ok)
                    .map((row) => (
                      <li key={row.url} className="py-3">
                        <p className="text-sm font-medium">{row.label ?? row.url}</p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{row.url}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {row.kind} · failed {row.failCount} time{row.failCount === 1 ? "" : "s"}
                          {row.status ? ` · answered ${row.status}` : ""}
                          {row.lastError ? ` · ${row.lastError}` : ""}
                        </p>
                        <p className="mt-1 text-xs font-medium">Do this: check the link yourself and pick a replacement source.</p>
                      </li>
                    ))
                )}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="imports">
          <Panel className="mt-6" title="Spreadsheet imports">
            <SpreadsheetSyncPanel />
          </Panel>
          <Panel className="mt-6" title="What is in the store">
            <Button onClick={() => run("Import check", loadSupporting)} disabled={busy !== null}>
              {busy === "Import check" ? "Loading…" : "Load import history"}
            </Button>
            {imports === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet loaded.</p>
            ) : (
              <>
                <ul className="mt-3 divide-y divide-border/60">
                  {importChecks.map((check) => (
                    <CheckRow key={check.id} check={check} />
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  {imports.lessons.length} lesson{imports.lessons.length === 1 ? "" : "s"} and{" "}
                  {imports.questions.reduce((total, row) => total + row.count, 0)} question
                  {imports.questions.reduce((total, row) => total + row.count, 0) === 1 ? "" : "s"} stored.
                </p>
              </>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="releases">
          <Panel
            className="mt-4"
            title="Release gate"
            description="Imported → Validated → Preview → Approved → Live. Nothing reaches learners until you approve it, and the previous good version is always kept."
          >
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No versions recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {versions.slice(0, 50).map((version) => {
                  const family = versions.filter((item) => item.topicId === version.topicId && item.kind === version.kind);
                  const rollbackAllowed = canRollback(family);
                  return (
                    <li key={version.id} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {version.topicId} · {version.kind}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {lifecycleLabel(version.status)} · fingerprint {version.contentHash.slice(0, 8)} · imported{" "}
                            {new Date(version.importedAt).toLocaleString()}
                          </p>
                          {version.validation.passed ? null : (
                            <p className="mt-1 text-xs text-destructive">
                              Validation failed ({version.validation.blocking} blocking) — publishing is blocked.
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {version.status === "validated" ? (
                          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => handleAdvance(version, "preview")}>
                            Preview
                          </Button>
                        ) : null}
                        {version.status === "validated" || version.status === "preview" ? (
                          <Button size="sm" disabled={busy !== null} onClick={() => handleAdvance(version, "approve")}>
                            Approve
                          </Button>
                        ) : null}
                        {version.status === "approved" ? (
                          <Button size="sm" disabled={busy !== null} onClick={() => handleAdvance(version, "publish")}>
                            Publish
                          </Button>
                        ) : null}
                        {version.status === "live" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" disabled={busy !== null || !rollbackAllowed.ok}>
                                Roll back
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Put the previous version back?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {rollbackAllowed.ok
                                    ? `The version live now is kept, and the last known-good version for ${version.topicId} ${version.kind} goes live instead.`
                                    : rollbackAllowed.reason}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRollback(version)} disabled={!rollbackAllowed.ok}>
                                  Roll back
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="engine">
          <Panel
            className="mt-4"
            title="Learning engine"
           
          >
            <Button onClick={() => run("Engine check", checkEngine)} disabled={busy !== null}>
              {busy === "Engine check" ? "Checking…" : "Run engine checks"}
            </Button>
            {engineChecks === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet checked.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border/60">
                {engineChecks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </ul>
            )}
          </Panel>
          <Panel className="mt-6" title="Everyday journeys">
            {flowChecks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Load the latest results from the Sources or Imports tab.</p>
            ) : (
              <ul className="space-y-2">
                {flowChecks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="log">
          <Panel className="mt-6" title="Activity log">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {activity.map((entry) => (
                  <ActivityRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="tools">
          <Panel className="mt-6" title="Service checks">
            <Button onClick={() => run("Service check", checkSystem)} disabled={busy !== null}>
              {busy === "Service check" ? "Checking…" : "Check services"}
            </Button>
            {systemChecks === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet checked.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border/60">
                {systemChecks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </ul>
            )}
          </Panel>
          <LearningPathsPanel />
          <Panel
            className="mt-4"
            title="Maintenance screen"
            description="Close a course while you work on it. Visitors see a short notice; you keep full access."
          >
            <MaintenancePanel />
          </Panel>
          <Panel className="mt-6" title="Browser diagnostics">
            <SystemDiagnostics />
          </Panel>
          <BetaAccessPanel />
          <SiteEngagementPanel />
        </TabsContent>
      </Tabs>
      </JumpToTab.Provider>
    </div>
  );
}
