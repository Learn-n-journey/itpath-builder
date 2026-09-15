/**
 * GAYL's floating presence.
 *
 * A small mark in the bottom right corner. It only carries a message when the
 * engine already has evidence that something is slipping or a mistake is still
 * open, and it stays quiet the rest of the time. Once a message is dismissed,
 * it does not come back until the underlying evidence changes.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ChevronDown, ChevronRight, X } from "lucide-react";

import gaylAvatar from "@/assets/gayl-avatar.png";
import { useAppState } from "@/state/app-state";
import { useIntelligence } from "@/hooks/use-intelligence";
import { alertInsight } from "@/lib/gayl/insights";
import { missedQuestionPrompt, missedQuestions } from "@/lib/missed-questions";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "itpath.gayl.bubble.dismissed";

/** Shortens a question prompt so the note stays readable. */
function trim(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
}

export function GaylBubble() {
  const intel = useIntelligence();
  const { user } = useAppState();
  const openDetail = useCallback(
    (topicId: string) => {
      const item = missedQuestions(user).find((entry) => entry.mistake.topicId === topicId);
      return item ? trim(missedQuestionPrompt(item)) : null;
    },
    [user],
  );
  const alert = alertInsight(intel, openDetail);

  const [dismissed, setDismissed] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY));
    } catch {
      setDismissed(null);
    }
  }, []);

  if (!alert || dismissed === alert.id) return null;

  const dismiss = () => {
    setOpen(false);
    setDismissed(alert.id);
    try {
      window.localStorage.setItem(DISMISS_KEY, alert.id);
    } catch {
      /* storage is optional here */
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="w-80 max-w-full rounded-lg border border-border bg-card p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <img
              src={gaylAvatar}
              alt=""
              width={816}
              height={816}
              loading="lazy"
              className="size-8 shrink-0 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Link to="/meet-gayl" className="hover:text-primary">
                  GAYL
                </Link>
              </p>
              <p className="mt-1 text-sm leading-6 text-foreground">{alert.message}</p>

              <ul className="mt-3 space-y-2">
                {alert.problems.map((problem) => (
                  <li
                    key={problem.topicId}
                    className="rounded-md border border-destructive/40 bg-destructive/5 p-2"
                  >
                    <p className="flex items-start gap-1.5 text-xs font-medium text-foreground">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
                      <Link
                        to="/topics/$topicId"
                        params={{ topicId: problem.topicId }}
                        className="hover:text-primary"
                      >
                        {problem.title}
                      </Link>
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {problem.issue}
                      {problem.detail ? `. Still open on: ${problem.detail}` : ""}
                    </p>
                  </li>
                ))}
              </ul>



              {alert.why && alert.why.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowWhy((value) => !value)}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                  >
                    {showWhy ? (
                      <ChevronDown className="size-3" aria-hidden />
                    ) : (
                      <ChevronRight className="size-3" aria-hidden />
                    )}
                    {showWhy ? "Hide why" : "Why this?"}
                  </button>
                  {showWhy ? (
                    <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                      {alert.why.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}

              <button
                type="button"
                onClick={dismiss}
                className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
              >
                Got it
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close GAYL message"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Hide GAYL message" : "Show GAYL message"}
        className={cn(
          "relative flex size-12 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-colors hover:border-primary/60",
        )}
      >
        <img
          src={gaylAvatar}
          alt=""
          width={816}
          height={816}
          loading="lazy"
          className="size-11 rounded-full"
        />
        {!open ? (
          <span className="absolute right-0.5 top-0.5 size-3 rounded-full border-2 border-card bg-destructive" aria-hidden />
        ) : null}
      </button>
    </div>
  );
}
