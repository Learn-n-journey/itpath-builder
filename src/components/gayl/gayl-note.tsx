/**
 * GAYL's visual identity.
 *
 * One quiet, consistent surface used everywhere the learning intelligence has
 * something worth saying. It never speaks unless there is evidence behind it,
 * and it never labels the learner, only what happened and what to do next.
 *
 * This component only presents what the existing engine already calculated.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Compass } from "lucide-react";

import { cn } from "@/lib/utils";

export function GaylMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-primary",
        className,
      )}
      aria-hidden
    >
      <Compass className="size-3.5" />
    </span>
  );
}

export function GaylNote({
  message,
  why,
  className,
  compact = false,
}: {
  message: string;
  /** Plain lines showing what this was based on, behind a "Why this?" toggle. */
  why?: string[];
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasWhy = Boolean(why && why.length > 0);

  return (
    <aside
      className={cn(
        "rounded-lg border border-border/70 border-l-2 border-l-primary/70 bg-secondary/25",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="flex gap-3">
        <GaylMark />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Link to="/meet-gayl" className="hover:text-primary">
              GAYL
            </Link>
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground">{message}</p>

          {hasWhy ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                {open ? (
                  <ChevronDown className="size-3" aria-hidden />
                ) : (
                  <ChevronRight className="size-3" aria-hidden />
                )}
                {open ? "Hide why" : "Why this?"}
              </button>
              {open ? (
                <ul className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                  {why?.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
