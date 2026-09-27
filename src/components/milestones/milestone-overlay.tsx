/**
 * The milestone overlay.
 *
 * When a milestone is earned that has never been celebrated on this device, it
 * takes over the screen once with a real moment of recognition, then gets out
 * of the way. Dismissed milestones stay dismissed.
 */
import { useEffect, useMemo, useState } from "react";
import { Trophy, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { achievedMilestones, type Milestone } from "@/lib/celebrations";
import { useAppState } from "@/state/app-state";
import { useIntelligence } from "@/hooks/use-intelligence";

const SEEN_KEY = "itpath.milestones.seen";

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function MilestoneOverlay() {
  const intel = useIntelligence();
  const { user } = useAppState();
  // Loaded after mount so the server render stays identical to first paint.
  const [seen, setSeen] = useState<string[] | null>(null);

  useEffect(() => {
    setSeen(readSeen());
  }, []);

  const achieved = useMemo(
    () => (seen ? achievedMilestones(intel, user) : []),
    [intel, user, seen],
  );
  const milestone: Milestone | null = seen
    ? (achieved.find((item) => !seen.includes(item.id)) ?? null)
    : null;

  if (!seen || !milestone) return null;

  const dismiss = () => {
    // Clearing one milestone clears every smaller one earned at the same time,
    // so a big jump never stacks up several popups in a row.
    const next = Array.from(new Set([...(seen ?? []), ...achieved.map((item) => item.id)]));
    setSeen(next);
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
    } catch {
      /* storage is optional here */
    }
  };

  return (
    <div
      role="dialog"
      aria-label={milestone.title}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="milestone-pop relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-card p-8 text-center shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/70"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -top-24 left-1/2 size-56 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close milestone"
          className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <img
          src="/ChatGPT%20Image%20Sep%2027%2C%202026%2C%2010_25_46%20AM.png"
          alt=""
          width={816}
          height={816}
          className="relative mx-auto size-16 rounded-full border border-primary/30 ring-4 ring-primary/10"
        />
        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          <Trophy className="size-3.5" aria-hidden />
          Milestone
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold">{milestone.title}</h2>
        <p className="mt-3 text-sm leading-6 text-foreground">{milestone.description}</p>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{milestone.detail}</p>
        <Button className="mt-6 w-full" onClick={dismiss}>
          Keep going
        </Button>
      </div>
    </div>
  );
}
