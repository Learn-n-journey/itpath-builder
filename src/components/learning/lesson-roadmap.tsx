import { BookOpen, Check, ChevronRight, HelpCircle } from "lucide-react";

import type { DeepLesson } from "@/data/deep-lessons";
import type { TopicReadingPosition } from "@/lib/app-data/types";
import { deepSectionId } from "@/lib/lesson-concepts";
import { cn } from "@/lib/utils";

export function LessonRoadmap({
  lesson,
  readingPosition,
  onSelectSection,
}: {
  lesson: DeepLesson;
  readingPosition?: TopicReadingPosition;
  onSelectSection: (sectionIndex: number) => void;
}) {
  const sectionIds = lesson.sections.map((section) => deepSectionId(lesson.topicId, section));
  const reviewed = new Set((readingPosition?.reviewedSectionIds ?? []).filter((id) => sectionIds.includes(id)));
  const savedIndex = readingPosition ? sectionIds.indexOf(readingPosition.sectionId) : -1;
  const firstUnread = sectionIds.findIndex((id) => !reviewed.has(id));
  const activeIndex = savedIndex >= 0 && !reviewed.has(sectionIds[savedIndex] ?? "")
    ? savedIndex
    : firstUnread >= 0
      ? firstUnread
      : Math.max(0, sectionIds.length - 1);
  const completed = sectionIds.filter((id) => reviewed.has(id)).length;
  const pct = sectionIds.length ? Math.round((completed / sectionIds.length) * 100) : 0;

  return (
    <section>
      <div className="mb-5 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <BookOpen className="size-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Stage 01</p>
            <h2 className="font-display text-2xl font-bold text-foreground">Learn It</h2>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">Build your understanding, one part at a time.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span><span className="tabular-nums">{completed} / {sectionIds.length} completed</span>
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Lesson reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <div className="h-full rounded-full bg-primary motion-safe:transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      </div>

      <h2 className="mb-3 flex items-center gap-1.5 font-display text-lg font-bold text-foreground">
        The lesson, part by part <HelpCircle className="size-4 text-muted-foreground" aria-hidden />
      </h2>
      <div className="relative space-y-2">
        <div aria-hidden className="absolute bottom-4 left-4 top-4 w-0.5 bg-border/60" />
        {lesson.sections.map((section, index) => {
          const id = sectionIds[index] ?? "";
          const isCompleted = reviewed.has(id);
          const isCurrent = index === activeIndex;
          return (
            <div key={id} className="relative flex items-stretch gap-3">
              <div className="relative z-10 flex w-8 shrink-0 items-center justify-center">
                <span className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 bg-card font-mono text-[11px] font-bold",
                  isCompleted && "border-success bg-success/10 text-success",
                  isCurrent && !isCompleted && "border-primary bg-primary/15 text-primary ring-4 ring-primary/10",
                  !isCompleted && !isCurrent && "border-border/80 text-muted-foreground",
                )}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Part ${index + 1}: ${section.heading}`}
                aria-current={isCurrent ? "step" : undefined}
                onClick={() => onSelectSection(index)}
                className={cn(
                  "flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCurrent ? "border-primary/50 bg-primary/5" : "border-border/60 bg-card hover:bg-muted/20",
                )}
              >
                <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-foreground sm:text-sm">{section.heading}</span>
                {isCompleted ? <Check className="size-4 shrink-0 text-success" aria-label="Completed" /> : null}
                {isCurrent && !isCompleted ? <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Current</span> : null}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
