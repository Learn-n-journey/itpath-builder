/**
 * GAYL's floating presence.
 *
 * A persistent bottom-left companion. Her visual state reflects whether the
 * engine has nothing to add, noticed a useful change, or needs attention. She
 * stays visually quiet when there is nothing worth interrupting. Once the latest
 * message is dismissed, it does not come back until the evidence changes, but
 * the full thread can still be opened at any time.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, X } from "lucide-react";

import gaylAvatar from "@/assets/gayl-avatar.png";
import { useAppState } from "@/state/app-state";
import { useIntelligence } from "@/hooks/use-intelligence";
import { checkInMessage, gaylMessages, lessonInsight, type GaylMessage } from "@/lib/gayl/insights";
import { gaylContinuityEvent } from "@/lib/gayl/continuity-events";
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const contextTopicId = useMemo(() => {
    const match = pathname.match(/^\/(?:topics|section-quiz|flashcards)\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }, [pathname]);
  const { user } = useAppState();
  const openDetail = useCallback(
    (topicId: string) => {
      const item = missedQuestions(user).find((entry) => entry.mistake.topicId === topicId);
      return item ? trim(missedQuestionPrompt(item)) : null;
    },
    [user],
  );
  const checkIn = useMemo(() => checkInMessage(user), [user]);
  const continuity = useMemo(() => gaylContinuityEvent(user, intel), [user, intel]);
  const contextual = useMemo<GaylMessage | null>(() => {
    if (!contextTopicId) return null;
    const insight = lessonInsight(intel, contextTopicId);
    const concept = intel.byTopic[contextTopicId];
    if (!insight || !concept) return null;
    return {
      id: `gayl:context:${pathname}:${contextTopicId}:${concept.diagnosis}:${concept.attempts}:${concept.unresolvedMistakes}`,
      topicId: contextTopicId,
      title: concept.title,
      text: insight.message,
      detail: openDetail(contextTopicId),
      route: pathname,
      urgent:
        concept.unresolvedMistakes > 0 ||
        concept.diagnosis === "misconception" ||
        concept.diagnosis === "confident_but_wrong" ||
        concept.diagnosis === "prerequisite_gap",
      why: [
        `You're working on ${concept.title} right now.`,
        ...(insight.why ?? []),
      ],
    };
  }, [contextTopicId, intel, openDetail, pathname]);
  const [clearedIds, setClearedIds] = useState<string[]>([]);
  // Problems come first. A welcome back only speaks up when nothing else is
  // asking for attention, so the corner stays a vital-only space. Cleared
  // messages stay out of the thread until the evidence behind them changes
  // and the message id changes with it.
  const messages = useMemo(() => {
    const base = gaylMessages(intel, openDetail);
    // Current-page context speaks first when GAYL has evidence about the topic
    // the learner is actually working on. Continuity and ordinary concerns
    // follow; a return greeting only appears when there is nothing else.
    const withoutContextDuplicate = contextual
      ? base.filter((message) => message.topicId !== contextual.topicId)
      : base;
    const active = [
      ...(contextual ? [contextual] : []),
      ...(continuity && continuity.topicId !== contextual?.topicId ? [continuity] : []),
      ...withoutContextDuplicate,
    ];
    const all = active.length === 0 && checkIn ? [checkIn] : active;
    return all.filter((message) => !clearedIds.includes(message.id));
  }, [intel, openDetail, contextual, continuity, checkIn, clearedIds]);
  const latest = messages[0] ?? null;
  const threadId = messages.map((message) => message.id).join("|");

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

  const restingMessage: GaylMessage = {
    id: "gayl:resting",
    topicId: "",
    title: "GAYL",
    text: "Nothing I'd stop you for right now. Keep going.",
    detail: null,
    route: "/",
    urgent: false,
    why: [],
  };
  const visibleLatest = latest ?? restingMessage;

  // Once dismissed, the mark goes quiet until the evidence changes, but the
  // thread itself stays reachable from the corner.
  const quiet = !latest || dismissed === threadId;
  const urgent = Boolean(latest?.urgent) && !quiet;
  const noticed = Boolean(latest) && !quiet && !urgent;

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
    <div className="pointer-events-none fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col-reverse items-start gap-2 sm:left-4 lg:bottom-6 lg:left-6">
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
            {(showAll ? messages : [visibleLatest]).map((message) => (
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
        data-gayl-state={urgent ? "attention" : noticed ? "noticed" : "quiet"}
        className={cn(
          "pointer-events-auto relative flex size-16 items-center justify-center rounded-full border bg-card shadow-lg transition-[transform,border-color,box-shadow] duration-300 ease-out hover:scale-105 active:scale-95 sm:size-14",
          quiet && "border-border opacity-90",
          noticed && "border-primary/60 shadow-[0_0_0_4px_hsl(var(--primary)/0.08),0_8px_24px_hsl(var(--primary)/0.16)]",
          urgent && "border-destructive/65 shadow-[0_0_0_4px_hsl(var(--destructive)/0.08),0_8px_28px_hsl(var(--destructive)/0.2)]",
          open && "scale-95 border-primary/70",
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
        {!open && noticed ? (
          <span
            className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-card bg-primary motion-safe:animate-[pulse_2.8s_ease-in-out_2]"
            aria-hidden
          />
        ) : null}
        {!open && urgent ? (
          <span
            className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-card bg-destructive motion-safe:animate-[pulse_3.2s_ease-in-out_infinite]"
            aria-hidden
          />
        ) : null}
      </button>
    </div>
  );
}
