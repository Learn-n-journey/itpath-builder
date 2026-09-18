/**
 * GAYL's floating presence.
 *
 * A small mark in the top right corner. It only carries a message when the
 * engine already has evidence that something is slipping, is still open, or is
 * worth finishing, and it stays quiet the rest of the time. Once the latest
 * message is dismissed, it does not come back until the evidence changes, but
 * the full thread can still be opened at any time.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, X } from "lucide-react";

import gaylAvatar from "@/assets/gayl-avatar.png";
import { useAppState } from "@/state/app-state";
import { useIntelligence } from "@/hooks/use-intelligence";
import { checkInMessage, gaylMessages, type GaylMessage } from "@/lib/gayl/insights";
import { missedQuestionPrompt, missedQuestions } from "@/lib/missed-questions";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "itpath.gayl.bubble.dismissed";
const CLEARED_KEY = "itpath.gayl.bubble.cleared";

function readCleared(): string[] {
  try {
    const raw = window.localStorage.getItem(CLEARED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Shortens a question prompt so the note stays readable. */
function trim(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
}

function MessageCard({
  message,
  showWhy,
  onClear,
}: {
  message: GaylMessage;
  showWhy: boolean;
  onClear?: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg rounded-tl-sm border p-3",
        message.urgent ? "border-destructive/40 bg-destructive/5" : "border-border bg-secondary/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-start gap-1.5 text-xs font-medium text-foreground">
          {message.urgent ? (
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
          ) : null}
          {message.topicId ? (
            <Link
              to="/topics/$topicId"
              params={{ topicId: message.topicId }}
              className="hover:text-primary"
            >
              {message.title}
            </Link>
          ) : (
          <span>{message.title}</span>
          )}
        </p>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear this message"
            className="-mr-1 -mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-sm leading-6 text-foreground">{message.text}</p>
      {message.detail ? (
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Still open on: {message.detail}
        </p>
      ) : null}
      {showWhy && message.why.length > 0 ? (
        <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
          {message.why.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
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
  const checkIn = useMemo(() => checkInMessage(user), [user]);
  const [clearedIds, setClearedIds] = useState<string[]>([]);
  // Problems come first. A welcome back only speaks up when nothing else is
  // asking for attention, so the corner stays a vital-only space. Cleared
  // messages stay out of the thread until the evidence behind them changes
  // and the message id changes with it.
  const messages = useMemo(() => {
    const base = gaylMessages(intel, openDetail);
    const all = base.length === 0 && checkIn ? [checkIn] : base;
    return all.filter((message) => !clearedIds.includes(message.id));
  }, [intel, openDetail, checkIn, clearedIds]);
  const latest = messages[0] ?? null;
  const threadId = messages.map((message) => message.id).join("|");
  const unreadCount = messages.filter((message) => message.urgent).length;

  const [dismissed, setDismissed] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY));
    } catch {
      setDismissed(null);
    }
    setClearedIds(readCleared());
  }, []);

  const clearMessages = (ids: string[]) => {
    setClearedIds((current) => {
      const next = Array.from(new Set([...current, ...ids]));
      try {
        window.localStorage.setItem(CLEARED_KEY, JSON.stringify(next));
      } catch {
        /* storage is optional here */
      }
      return next;
    });
  };

  if (!latest) return null;

  // Once dismissed, the mark goes quiet until the evidence changes, but the
  // thread itself stays reachable from the corner.
  const quiet = dismissed === threadId;

  const dismiss = () => {
    setOpen(false);
    setShowAll(false);
    setDismissed(threadId);
    try {
      window.localStorage.setItem(DISMISS_KEY, threadId);
    } catch {
      /* storage is optional here */
    }
  };

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col-reverse items-end gap-2 sm:right-6 sm:top-6">
      <div
        aria-hidden={!open}
        className={cn(
          "origin-top-right transition-all duration-200 ease-out",
          open
            ? "pointer-events-auto visible translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible -translate-y-2 scale-95 opacity-0",
        )}
      >
        <div className="flex w-80 max-w-full flex-col rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            {showAll ? (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                aria-label="Back to the latest message"
                className="text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
            ) : (
              <img
                src={gaylAvatar}
                alt=""
                width={816}
                height={816}
                loading="lazy"
                className="size-7 shrink-0 rounded-full"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                <Link to="/meet-gayl" className="hover:text-primary">
                  GAYL
                </Link>
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {showAll
                  ? `${messages.length} message${messages.length === 1 ? "" : "s"}`
                  : "Latest message"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close GAYL messages"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div key={showAll ? "all" : "latest"} className="gayl-rise max-h-[60vh] space-y-3 overflow-y-auto p-3">
            {(showAll ? messages : [latest]).map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                showWhy={showWhy}
                onClear={() => clearMessages([message.id])}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2">
            <button
              type="button"
              onClick={() => setShowWhy((value) => !value)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              {showWhy ? (
                <ChevronDown className="size-3" aria-hidden />
              ) : (
                <ChevronRight className="size-3" aria-hidden />
              )}
              {showWhy ? "Hide why" : "Why this?"}
            </button>
            {!showAll ? (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:border-primary/60 hover:text-primary"
              >
                <MessageSquare className="size-3" aria-hidden />
                {messages.length > 1 ? `See all ${messages.length} messages` : "See all messages"}
              </button>
            ) : null}
            {messages.length > 1 ? (
              <button
                type="button"
                onClick={() => clearMessages(messages.map((message) => message.id))}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                Clear all
              </button>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              Got it
            </button>
          </div>
          </div>
        </div>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Hide GAYL messages" : "Show GAYL messages"}
        className={cn(
          "pointer-events-auto relative flex size-16 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-all duration-200 ease-out hover:scale-105 hover:border-primary/60 active:scale-90 sm:size-14",
          open && "scale-95 border-primary/60",
        )}
      >
        <img
          src={gaylAvatar}
          alt=""
          width={816}
          height={816}
          loading="lazy"
          className={cn(
            "size-14 rounded-full transition-transform duration-200 ease-out sm:size-12",
            open && "scale-90",
          )}
        />
        {!open && !quiet && unreadCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full border-2 border-card bg-destructive text-xs font-semibold text-destructive-foreground animate-pulse sm:size-5 sm:text-[10px]"
            aria-hidden
          >
            {unreadCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
