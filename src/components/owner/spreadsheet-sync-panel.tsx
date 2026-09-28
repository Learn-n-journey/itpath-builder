import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { clearSyncLock, proposeSyncAdviceFix, refreshTopic, syncNow, syncStatus, type SyncRunStatus } from "@/lib/sheet-sync.functions";
import { applyTopicFactCorrection } from "@/lib/admin.functions";
import { loadOwnerQuestions } from "@/lib/owner-question-store";
import { loadOwnerLessons } from "@/lib/owner-lesson-store";
import { loadOwnerWork } from "@/lib/owner-work-store";

/** Owner-only spreadsheet import controls and the result of recent scans. */
export function SpreadsheetSyncPanel() {
  const runSyncNow = useServerFn(syncNow);
  const runClearLock = useServerFn(clearSyncLock);
  const proposeAdviceFix = useServerFn(proposeSyncAdviceFix);
  const applyAdviceFix = useServerFn(applyTopicFactCorrection);
  const refreshOneTopic = useServerFn(refreshTopic);
  const readStatus = useServerFn(syncStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [live, setLive] = useState<SyncRunStatus | null>(null);
  const [history, setHistory] = useState<SyncRunStatus[]>([]);
  const [fixingAdvice, setFixingAdvice] = useState<string | null>(null);
  const finishedRef = useRef<string | null>(null);

  const scopeLabel = (scope: string) =>
    scope === "it-cybersecurity"
      ? "IT PATH"
      : scope === "auto-repair"
        ? "AUTO PATH"
        : scope === "all"
          ? "Everything"
          : scope;

  const describe = useCallback((run: SyncRunStatus): string => {
    const summary = run.result;
    if (run.status === "queued") return "Starting — keep this page open until it finishes.";
    if (run.status === "running") {
      const p = run.progress;
      return p
        ? `Running — ${p.stage}${p.file ? ` · ${p.file}` : ""} · ${p.filesDone} workbook(s) read, ` +
            `${p.approved} question(s) in, ${p.lessonsApproved} lesson(s) published` +
            (p.unchangedFiles ? `, ${p.unchangedFiles} skipped` : "") +
            ". Keep the app open until it finishes."
        : "Running now. Keep the app open until it finishes.";
    }
    if (run.status === "failed") return `Failed: ${run.error ?? "the sync did not finish."}`;
    if (!summary) return "Finished.";
    if (summary.skipped) return `Skipped: ${summary.skipped}`;
    const held = (summary.lessonIssues ?? [])
      .map((item) => `${item.file} (${item.topic}): ${item.reasons.join("; ")}`)
      .join("\n");
    return (
      `Finished ${run.finishedAt ? new Date(run.finishedAt).toLocaleTimeString() : ""} — ` +
      `${summary.topics} topic${summary.topics === 1 ? "" : "s"} · ` +
      `${summary.approved} questions in, ${summary.rejected} rejected · ` +
      `${summary.lessonsApproved} lesson${summary.lessonsApproved === 1 ? "" : "s"} published, ` +
      `${summary.lessonsRejected} with notes · ` +
      `${summary.workTopics} try-it/lab topic${summary.workTopics === 1 ? "" : "s"}` +
      (summary.unchangedFiles
        ? ` · ${summary.unchangedFiles} unchanged workbook${summary.unchangedFiles === 1 ? "" : "s"} skipped`
        : "") +
      (held ? `\nPublished with notes:\n${held}` : "")
    );
  }, []);

  const refresh = useCallback(async () => {
    try {
      const status = await readStatus({});
      setHistory(
        (status.runs ?? [])
          .filter((item) => item.status === "done" || item.status === "failed")
          .slice(0, 3),
      );
      const run = status.runs[0];
      if (!run) return;
      setLive(run);
      setLastRun(describe(run));
      const settled = run.status === "done" || run.status === "failed";
      if (settled && finishedRef.current !== run.id) {
        finishedRef.current = run.id;
        await Promise.all([loadOwnerQuestions(), loadOwnerLessons(), loadOwnerWork()]);
      }
    } catch {
      /* status is only informational */
    }
  }, [describe, readStatus]);

  // Picks the run back up whenever the page is opened again, and keeps the
  // line fresh while one is in flight.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (live?.status !== "queued" && live?.status !== "running") return;
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [live?.status, refresh]);

  async function handleClearLock() {
    setBusy("clear");
    try {
      const result = await runClearLock({});
      if (!result.ok) {
        toast.error(result.error ?? "Could not clear it.");
        return;
      }
      toast.success("Cleared. You can start a sync again now.");
      setLive(null);
      setLastRun("Stuck sync cleared — try syncing again.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear it.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSync(
    scope: "it-cybersecurity" | "auto-repair" | "all",
    label: string,
    force = false,
  ) {
    setBusy(force ? `${scope}-force` : scope);
    try {
      const result = await runSyncNow({ data: { scope, force } });
      if (!result.ok) {
        toast.error(result.error ?? "The sync could not be started.");
        setLastRun(`Failed: ${result.error ?? "The sync could not be started."}`);
        return;
      }
      toast.success(`${label} sync started — keep the app open until it finishes.`);
      setLastRun("Starting — keep this page open until it finishes.");
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The sync could not be started.";
      toast.error(message);
      setLastRun(`Failed: ${message}`);
    } finally {
      setBusy(null);
    }
  }

  async function handleFixAdvice(
    runId: string,
    issue: { file: string; topic: string; domain?: string; topicId?: string; reasons: string[] },
    reason: string,
  ) {
    if (!issue.domain || !issue.topicId) {
      toast.error("Run a new sync first so this advice has the workbook identity needed for a safe fix.");
      return;
    }
    const key = `${runId}:${issue.topicId}:${reason}`;
    setFixingAdvice(key);
    try {
      const proposal = await proposeAdviceFix({ data: { topicId: issue.topicId, reason } });
      if (!proposal.ok || !proposal.claim || !proposal.correction) {
        toast.error(proposal.error ?? "This advice needs manual review.");
        return;
      }
      const approved = window.confirm(
        `Apply this targeted workbook fix?\n\nADVICE:\n${reason}\n\nCURRENT:\n${proposal.claim}\n\nREPLACEMENT:\n${proposal.correction}`,
      );
      if (!approved) return;

      const applied = await applyAdviceFix({
        data: { topicId: issue.topicId, claim: proposal.claim, correction: proposal.correction },
      });
      if (!applied.ok) {
        toast.error(applied.error ?? "The workbook could not be updated.", { duration: 10000 });
        return;
      }

      const checked = await refreshOneTopic({ data: { domain: issue.domain, topicId: issue.topicId } });
      if (!checked.ok || !checked.summary) {
        toast.warning(`Workbook updated, but the topic recheck could not finish: ${checked.error ?? "unknown error"}`, { duration: 10000 });
        return;
      }
      const remaining = checked.summary.lessonIssues.flatMap((item) => item.reasons);
      if (remaining.includes(reason)) {
        toast.warning("The workbook was updated, but this advice still appears after rechecking.", { duration: 10000 });
        return;
      }

      setHistory((current) =>
        current.map((run) =>
          run.id !== runId || !run.result
            ? run
            : {
                ...run,
                result: {
                  ...run.result,
                  lessonIssues: run.result.lessonIssues
                    .map((item) =>
                      item.file === issue.file && item.topic === issue.topic
                        ? { ...item, reasons: item.reasons.filter((itemReason) => itemReason !== reason) }
                        : item,
                    )
                    .filter((item) => item.reasons.length > 0),
                },
              },
        ),
      );
      toast.success(`Fixed ${issue.file} and rechecked the topic.`);
      await Promise.all([loadOwnerQuestions(), loadOwnerLessons(), loadOwnerWork()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The advice could not be fixed.");
    } finally {
      setFixingAdvice(null);
    }
  }

  const inFlight = live?.status === "queued" || live?.status === "running";

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => handleSync("it-cybersecurity", "IT PATH")} disabled={busy !== null || inFlight}>
          Sync IT PATH
        </Button>
        <Button onClick={() => handleSync("auto-repair", "AUTO PATH")} disabled={busy !== null || inFlight}>
          Sync AUTO PATH
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSync("all", "Both courses")}
          disabled={busy !== null || inFlight}
        >
          Sync everything
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSync("all", "Full re-read", true)}
          disabled={busy !== null || inFlight}
        >
          Re-read everything
        </Button>
        <Button variant="outline" onClick={handleClearLock} disabled={busy === "clear"}>
          {busy === "clear" ? "Clearing…" : "Clear stuck sync"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        A sync runs while the app is open, so leave this page up until it finishes. It only opens
        workbooks that changed since last time, so it is much quicker; use “Re-read everything” to pull every
        workbook again. It may take a minute to start. If one seems stuck, use “Clear stuck sync”, then start it again.
      </p>
      <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
        {lastRun ??
          "Reads the “it path” and “auto path” folders in OneDrive, each with its lessons, try it, quiz and labs sub-folders. The nightly pull happens on its own."}
      </p>
      {history.length > 0 ? (
        <div className="mt-4 rounded-lg border border-border/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Last {history.length} scan{history.length === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 space-y-3">
            {history.map((run) => (
              <li key={run.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {scopeLabel(run.scope)} ·{" "}
                  {new Date(run.finishedAt ?? run.createdAt).toLocaleString()}
                </span>
                <span className="mt-1 block whitespace-pre-line">{describe(run)}</span>
                {(run.result?.lessonIssues ?? []).length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {run.result!.lessonIssues.map((issue) =>
                      issue.reasons.map((reason) => {
                        const key = `${run.id}:${issue.topicId ?? issue.file}:${reason}`;
                        return (
                          <div key={key} className="rounded-md border border-border/60 bg-background/60 p-2">
                            <p className="font-medium text-foreground">{issue.file} · {issue.topic}</p>
                            <p className="mt-1">{reason}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              disabled={fixingAdvice !== null || !issue.domain || !issue.topicId}
                              onClick={() => void handleFixAdvice(run.id, issue, reason)}
                            >
                              {fixingAdvice === key ? "Preparing fix…" : issue.domain && issue.topicId ? "Fix" : "Run sync again to enable Fix"}
                            </Button>
                          </div>
                        );
                      }),
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
