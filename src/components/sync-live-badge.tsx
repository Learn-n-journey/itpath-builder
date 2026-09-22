/**
 * A small floating counter that shows a spreadsheet sync moving, on any page.
 *
 * Only the owner sees it, and it only appears while a sync is queued or
 * running, so it never gets in the way of normal study.
 */
import { useServerFn } from "@tanstack/react-start";
import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { syncStatus, syncSlice, type SyncRunStatus } from "@/lib/sheet-sync.functions";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { useAuth } from "@/state/auth-state";
import { loadOwnerQuestions } from "@/lib/owner-question-store";
import { loadOwnerLessons } from "@/lib/owner-lesson-store";
import { loadOwnerWork } from "@/lib/owner-work-store";
import { toast } from "sonner";

const IN_FLIGHT_MS = 5_000;
const IDLE_MS = 60_000;

export function SyncLiveBadge() {
  const { email } = useAuth();
  const isOwner = OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
  const readStatus = useServerFn(syncStatus);
  const runSlice = useServerFn(syncSlice);
  const [run, setRun] = useState<SyncRunStatus | null>(null);
  const [hidden, setHidden] = useState(false);
  const settledRef = useRef<string | null>(null);
  const slicing = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const status = await readStatus({});
      const latest = status.runs[0] ?? null;
      setRun(latest);
      if (!latest) return;
      const settled = latest.status === "done" || latest.status === "failed";
      if (settled && settledRef.current && settledRef.current !== latest.id) {
        settledRef.current = latest.id;
        await Promise.all([loadOwnerQuestions(), loadOwnerLessons(), loadOwnerWork()]);
        if (latest.status === "done") {
          const summary = latest.result;
          toast.success(
            summary
              ? `Sync finished — ${summary.topics} topic(s), ${summary.approved} questions in, ${summary.lessonsApproved} lesson(s) published.`
              : "Sync finished.",
          );
        } else {
          toast.error(`Sync failed: ${latest.error ?? "it did not finish."}`);
        }
      }
      if (!settledRef.current) settledRef.current = latest.id;
      if (!settled) setHidden(false);
    } catch {
      /* the counter is only informational */
    }
  }, [readStatus]);

  const inFlight = run?.status === "queued" || run?.status === "running";

  useEffect(() => {
    if (!isOwner) return;
    void refresh();
  }, [isOwner, refresh]);

  useEffect(() => {
    if (!isOwner) return;
    const timer = window.setInterval(() => void refresh(), inFlight ? IN_FLIGHT_MS : IDLE_MS);
    return () => window.clearInterval(timer);
  }, [isOwner, inFlight, refresh]);

  // Keeps the run moving while the app is open: one slice at a time, never two
  // at once.
  useEffect(() => {
    if (!isOwner || !inFlight) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || slicing.current) return;
      slicing.current = true;
      try {
        await runSlice({});
      } catch {
        /* the next tick tries again */
      } finally {
        slicing.current = false;
        if (!stopped) void refresh();
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 4_000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [isOwner, inFlight, refresh, runSlice]);

  if (!isOwner || !inFlight || hidden || !run) return null;

  const progress = run.progress;
  const line =
    run.status === "queued"
      ? "Starting…"
      : progress
        ? `${progress.course === "auto-repair" ? "AUTO PATH" : progress.course === "it-cybersecurity" ? "IT PATH" : progress.course} · ${progress.stage}${progress.file ? ` · ${progress.file}` : ""}`
        : "Reading your workbooks…";

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-[18rem] rounded-lg border border-border bg-card/95 px-3 py-2 shadow-lg backdrop-blur">
      <div className="flex items-start gap-2">
        <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">Spreadsheet sync</p>
          <p className="truncate text-[11px] text-muted-foreground">{line}</p>
          {progress ? (
            <p className="text-[11px] text-muted-foreground">
              {progress.filesDone} workbook{progress.filesDone === 1 ? "" : "s"} read ·{" "}
              {progress.approved} question{progress.approved === 1 ? "" : "s"} ·{" "}
              {progress.lessonsApproved} lesson{progress.lessonsApproved === 1 ? "" : "s"}
              {progress.unchangedFiles ? ` · ${progress.unchangedFiles} skipped` : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Hide sync counter"
          className="ml-auto text-muted-foreground hover:text-foreground"
          onClick={() => setHidden(true)}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
