import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { areaHealth, buildOverview, filterChecks, stateLabel, type HealthFilter } from "@/lib/admin/health-state";
import type { ActivityEntry, ContentVersion, FlowCounter, HealthCheck, HealthState } from "@/lib/admin/types";
import { canRollback, lifecycleLabel } from "@/lib/admin/release";
import {
  advanceVersion,
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
  healthy: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  failed: "border-red-500/40 bg-red-500/10 text-red-400",
  unknown: "border-border bg-muted/40 text-muted-foreground",
};

function StateChip({ state }: { state: HealthState }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[state]}`}>
      {stateLabel(state)}
    </span>
  );
}

function AnswerCard({ question, state, note }: { question: string; state: HealthState; note: string }) {
  return (
    <div className={`rounded-xl border p-3 ${TONE[state]}`}>
      <p className="text-xs font-medium opacity-80">{question}</p>
      <p className="mt-1 text-base font-semibold">{stateLabel(state)}</p>
      <p className="mt-1 text-xs opacity-80">{note}</p>
    </div>
  );
}

/** Lets a finding send the owner to another tab of this same screen. */
const JumpToTab = createContext<((tab: string) => void) | null>(null);

function CheckRow({ check }: { check: HealthCheck }) {
  const jump = useContext(JumpToTab);
  const target = checkTarget(check);
  return (
    <li className="rounded-lg border border-border/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{check.label}</p>
        <StateChip state={check.state} />
      </div>
      {check.detail ? <p className="mt-1 text-xs text-muted-foreground">{check.detail}</p> : null}
      {check.state !== "healthy" && check.affects ? (
        <p className="mt-1 text-xs text-muted-foreground">Affects: {check.affects}</p>
      ) : null}
      {check.state !== "healthy" && check.action ? (
        <p className="mt-1 text-xs font-medium text-foreground">Do this: {check.action}</p>
      ) : null}
      {target ? (
        target.tab ? (
          <Button className="mt-2" size="sm" variant="outline" onClick={() => jump?.(target.tab as string)}>
            {target.label}
          </Button>
        ) : (
          <Button className="mt-2" size="sm" variant="outline" asChild>
            <a
              href={target.href}
              {...(target.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {target.label}
            </a>
          </Button>
        )
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
        id: "imports:versioned",
        area: "imports",
        label: "Version fingerprints",
        state: withoutHash === 0 ? "healthy" : "warning",
        detail:
          withoutHash === 0
            ? "Every imported lesson carries a fingerprint, so changes are detected by content."
            : `${withoutHash} lesson${withoutHash === 1 ? "" : "s"} predate fingerprints, so changes to them can only be spotted by date.`,
        affects: "Change detection falls back to timestamps for those lessons.",
        action: "Re-read everything once to fingerprint the older lessons.",
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
      <PageHeader
        title="Control room"
        description="Everything that tells you whether IT PATH and its material are in good shape."
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <AnswerCard question="Is IT PATH working?" state={overview.working} note="Services and speed" />
        <AnswerCard question="Is the content healthy?" state={overview.content} note="Topics and imports" />
        <AnswerCard question="Is anything blocking learners?" state={overview.blocking} note="Engine, content, services" />
        <AnswerCard question="Does anything need me?" state={overview.attention} note="Across every area" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={runEverything} disabled={busy !== null}>
          {busy === "Full health check" ? "Checking…" : "Run full health check"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {overview.lastRunAt ? `Last run ${new Date(overview.lastRunAt).toLocaleString()}` : "Nothing has been checked yet."}
        </span>
      </div>

      <Tabs defaultValue="overview" className="mt-5">
        <TabsList className="flex w-full flex-wrap justify-start gap-1">
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
          <Panel className="mt-4" title="What needs attention">
            <div className="flex flex-wrap gap-1">
              {FILTERS.map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={filter === item.id ? "default" : "outline"}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <Input
              className="mt-3"
              value={topicFilter}
              placeholder="Filter by topic id"
              onChange={(event) => setTopicFilter(event.target.value.trim())}
            />
            <ul className="mt-3 space-y-2">
              {shown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing matches that filter. Run the full health check if areas still say “Not yet checked”.
                </p>
              ) : (
                shown.slice(0, 120).map((check) => <CheckRow key={check.id} check={check} />)
              )}
            </ul>
          </Panel>

          <Panel className="mt-4" title="Areas">
            <ul className="space-y-2">
              {areas
                .filter((area) => area.area !== "performance")
                .map((area) => (
                  <li key={area.area} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize">{area.area}</p>
                      <p className="text-xs text-muted-foreground">
                        {area.lastRunAt ? `Checked ${new Date(area.lastRunAt).toLocaleString()}` : "Never checked"}
                      </p>
                    </div>
                    <StateChip state={area.state} />
                  </li>
                ))}
            </ul>
          </Panel>
        </TabsContent>

        <TabsContent value="content">
          <Panel className="mt-4" title="Topic health" description="Every topic, checked against the quality rules already used by the course.">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => run("Content check", checkContent)} disabled={busy !== null}>
                {busy === "Content check" ? "Checking…" : "Check all topics"}
              </Button>
              <Button variant="outline" onClick={downloadCoverageGaps}>
                Download coverage report
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The download judges every quiz, self-check and recall question on the knowledge it needs, not its wording, and lists
              anything the topic or its prerequisites never taught.
            </p>

            {contentReport === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet checked.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {contentReport
                  .filter((topic) => (filter === "healthy" ? topic.state === "healthy" : topic.state !== "healthy"))
                  .map((topic) => (
                    <li key={topic.topicId} className="rounded-lg border border-border/60 p-3">
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
                        <ul className="mt-2 space-y-2">
                          {topic.checks.map((check) => (
                            <CheckRow key={check.id} check={check} />
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="sources">
          <Panel className="mt-4" title="Reading and video sources" description="Checked by the nightly crawler. Replacements are always your decision.">
            <Button onClick={() => run("Source check", loadSupporting)} disabled={busy !== null}>
              {busy === "Source check" ? "Loading…" : "Load latest results"}
            </Button>
            {sources === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet loaded.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sources.filter((row) => !row.ok).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Every checked source answered.</p>
                ) : (
                  sources
                    .filter((row) => !row.ok)
                    .map((row) => (
                      <li key={row.url} className="rounded-lg border border-border/60 p-3">
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
          <Panel className="mt-4" title="Spreadsheet imports">
            <SpreadsheetSyncPanel />
          </Panel>
          <Panel className="mt-4" title="What is in the store">
            <Button onClick={() => run("Import check", loadSupporting)} disabled={busy !== null}>
              {busy === "Import check" ? "Loading…" : "Load import history"}
            </Button>
            {imports === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet loaded.</p>
            ) : (
              <>
                <ul className="mt-3 space-y-2">
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
                    <li key={version.id} className="rounded-lg border border-border/60 p-3">
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
                            <p className="mt-1 text-xs text-red-400">
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
            description="Checks prerequisites, unlocking, concept links and review targets. These only read the course material, never a learner's progress."
          >
            <Button onClick={() => run("Engine check", checkEngine)} disabled={busy !== null}>
              {busy === "Engine check" ? "Checking…" : "Run engine checks"}
            </Button>
            {engineChecks === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet checked.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {engineChecks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </ul>
            )}
          </Panel>
          <Panel className="mt-4" title="Everyday journeys">
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
          <Panel className="mt-4" title="Activity log" description="Imports, validation, approvals, publications, rollbacks and blocked steps.">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {activity.map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-border/60 p-3">
                    <p className="text-sm font-medium">
                      {entry.action}
                      {entry.subject ? ` · ${entry.subject}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()} · {entry.area} · {entry.result}
                    </p>
                    {Object.keys(entry.detail).length > 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {Object.entries(entry.detail)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="tools">
          <Panel className="mt-4" title="Service checks" description="Runs live checks against the services the app depends on.">
            <Button onClick={() => run("Service check", checkSystem)} disabled={busy !== null}>
              {busy === "Service check" ? "Checking…" : "Check services"}
            </Button>
            {systemChecks === null ? (
              <p className="mt-3 text-sm text-muted-foreground">Not yet checked.</p>
            ) : (
              <ul className="mt-3 space-y-2">
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
          <Panel className="mt-4" title="Browser diagnostics" description="Live checks against this browser session.">
            <SystemDiagnostics />
          </Panel>
          <BetaAccessPanel />
          <SiteEngagementPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
