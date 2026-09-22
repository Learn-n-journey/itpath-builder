import { useState } from "react";
import { Check, ListChecks } from "lucide-react";

import { masteryGate } from "@/lib/mastery-gate";
import { useAppState } from "@/state/app-state";

/**
 * A small ring that follows the learner while they read a lesson, showing how
 * much of the section's proof work is done. Tapping it lists every required
 * proof and jumps to the work section.
 */
export function LessonProgressRing({ topicId }: { topicId: string }) {
  const { user } = useAppState();
  const [open, setOpen] = useState(false);
  const gate = masteryGate(user, topicId);
  const required = gate.competencies.filter((item) => item.required);
  const met = required.filter((item) => item.met).length;
  const total = required.length;
  const pct = total === 0 ? 0 : Math.round((met / total) * 100);
  const allDone = total > 0 && met === total;

  // Nothing to follow until some proof work exists.
  if (met === 0) return null;

  function jumpToWork() {
    setOpen(false);
    document.getElementById("prove-it")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 print:hidden">
      {open ? (
        <div className="mb-2 w-64 rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="text-sm font-medium">
            {allDone ? "Every proof is in for this section" : `${met} of ${total} proofs done`}
          </p>
          <ul className="mt-2 space-y-1.5">
            {required.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-xs">
                <span
                  className={
                    item.met
                      ? "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      : "mt-0.5 size-3.5 shrink-0 rounded-full border border-border"
                  }
                  aria-hidden
                >
                  {item.met ? <Check className="size-2.5" strokeWidth={3} /> : null}
                </span>
                <span className={item.met ? "text-muted-foreground line-through" : ""}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={jumpToWork}
            className="mt-3 w-full rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            Go to the proof work
          </button>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={`Proof work: ${met} of ${total} done. Show details.`}
        className="flex size-14 items-center justify-center rounded-full border border-border bg-card shadow-lg transition-transform active:scale-95"
      >
        <svg className="size-12 -rotate-90" viewBox="0 0 48 48" aria-hidden>
          <circle cx="24" cy="24" r="19" fill="none" stroke="var(--color-secondary)" strokeWidth="4" />
          <circle
            cx="24"
            cy="24"
            r="19"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="4"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${pct} 100`}
          />
        </svg>
        <ListChecks className="absolute size-4 text-primary" aria-hidden />
      </button>
    </div>
  );
}
