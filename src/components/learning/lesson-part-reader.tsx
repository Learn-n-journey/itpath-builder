import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Clock, FileText, Gauge } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { DeepLesson } from "@/data/deep-lessons";
import type { Difficulty } from "@/lib/app-data/types";

const difficultyLabel: Record<Difficulty, string> = {
  gentle: "Beginner",
  standard: "Intermediate",
  challenging: "Advanced",
};

export function LessonPartReader({
  lesson,
  sectionIndex,
  difficulty,
  onBackToRoadmap,
  onNavigateSection,
  onCompleteSection,
}: {
  lesson: DeepLesson;
  sectionIndex: number;
  difficulty: Difficulty;
  onBackToRoadmap: () => void;
  onNavigateSection: (newIndex: number) => void;
  onCompleteSection: (sectionIndex: number) => void;
}) {
  const section = lesson.sections[sectionIndex];
  if (!section) return null;
  const progressPct = Math.round(((sectionIndex + 1) / lesson.sections.length) * 100);
  const wordCount = [...section.paragraphs, ...(section.bullets ?? [])].join(" ").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));

  const completeAndGo = () => {
    onCompleteSection(sectionIndex);
    if (sectionIndex < lesson.sections.length - 1) onNavigateSection(sectionIndex + 1);
    else onBackToRoadmap();
  };

  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-border/50 pb-3">
        <Button variant="ghost" size="sm" onClick={onBackToRoadmap} className="-ml-2">
          <ChevronLeft className="size-4" aria-hidden />Back to lesson
        </Button>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 text-xs font-mono tabular-nums text-muted-foreground">{sectionIndex + 1} of {lesson.sections.length}</span>
          <Button variant="outline" size="icon" className="size-9 rounded-full" aria-label="Previous lesson part" disabled={sectionIndex === 0} onClick={() => onNavigateSection(sectionIndex - 1)}><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="icon" className="size-9 rounded-full" aria-label="Next lesson part" disabled={sectionIndex === lesson.sections.length - 1} onClick={() => onNavigateSection(sectionIndex + 1)}><ChevronRight className="size-4" /></Button>
        </div>
      </div>

      <p className="mb-1 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"><BookOpen className="size-3.5" aria-hidden />Stage 01 · Learn It</p>
      <h1 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">{section.heading}</h1>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>Lesson progress</span><span className="tabular-nums">{progressPct}%</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Position in lesson" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPct}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Clock className="size-3.5" aria-hidden />{minutes} min</span>
        <span className="inline-flex items-center gap-1.5"><BookOpen className="size-3.5" aria-hidden />Reading</span>
        <span className="inline-flex items-center gap-1.5"><Gauge className="size-3.5" aria-hidden />{difficultyLabel[difficulty]}</span>
      </div>

      {lesson.plain?.plainIntro && sectionIndex === 0 ? (
        <div className="my-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-primary"><FileText className="size-4" aria-hidden />In plain words</div>
          <p className="text-sm leading-7 text-foreground/90">{lesson.plain.plainIntro}</p>
        </div>
      ) : null}

      <div className="mt-6 space-y-5 text-sm leading-7 text-muted-foreground sm:text-base">
        {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {section.bullets?.length ? (
          <ul className="space-y-2.5">
            {section.bullets.map((bullet) => <li key={bullet} className="flex gap-3"><span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" /><span>{bullet}</span></li>)}
          </ul>
        ) : null}
      </div>

      <div className="mt-8 border-t border-border/50 pt-4">
        <Button className="h-11 w-full rounded-xl font-semibold" onClick={completeAndGo}>
          {sectionIndex < lesson.sections.length - 1 ? <>Continue to next part<ArrowRight className="size-4" /></> : <>Finish lesson & return to map<Check className="size-4" /></>}
        </Button>
      </div>
    </section>
  );
}
