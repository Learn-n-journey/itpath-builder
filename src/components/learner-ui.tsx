import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { accentFill, accentSelection, accentSurface, accentText, type VisualAccent } from "@/lib/visual-accents";

export function CompactStats({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-3 divide-x divide-border border-y border-border py-3", className)}>{children}</div>;
}

export function CompactStat({ value, label, icon: Icon, accent = "cyan" }: { value: ReactNode; label: string; icon?: LucideIcon; accent?: VisualAccent }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className={cn("size-4 shrink-0", accentText[accent])} aria-hidden /> : null}
        <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
      </div>
      <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">{label}</p>
    </div>
  );
}

export function ProgressLine({ value, label, className, accent = "cyan" }: { value: number; label?: string; className?: string; accent?: VisualAccent }) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3", className)}>
      <div className="min-w-0">
        {label ? <p className="mb-1 truncate text-xs text-muted-foreground">{label}</p> : null}
        <Progress value={value} className="h-1.5" indicatorClassName={accentFill[accent]} />
      </div>
      <span className="text-xs font-semibold tabular-nums">{Math.round(value)}%</span>
    </div>
  );
}

export function ContentRow({
  icon: Icon,
  eyebrow,
  title,
  description,
  metadata,
  progress,
  status,
  trailing,
  selected,
  accent = "cyan",
  className,
}: {
  icon?: LucideIcon;
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  metadata?: ReactNode;
  progress?: number;
  status?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  accent?: VisualAccent;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 px-1 py-3 text-left transition-[background-color,transform] duration-150 last:border-b-0 hover:bg-accent/35 active:scale-[0.995]", selected && accentSelection[accent], className)}>
      {Icon ? <span className={cn("grid size-9 shrink-0 place-items-center rounded-md ring-1 ring-inset", accentSurface[accent])}><Icon className="size-4" aria-hidden /></span> : <span />}
      <div className="min-w-0">
        {eyebrow ? <p className={cn("truncate text-[0.6875rem] font-medium", accentText[accent])}>{eyebrow}</p> : null}
        <p className="truncate text-sm font-semibold">{title}</p>
        {description ? <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">{description}</p> : null}
        {metadata ? <div className="mt-1 text-[0.6875rem] text-muted-foreground">{metadata}</div> : null}
        {typeof progress === "number" ? <ProgressLine value={progress} accent={accent} className="mt-2" /> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status}
        {trailing ?? <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
      </div>
    </div>
  );
}

export function ContentRowSkeleton() {
  return (
    <div className="grid min-h-16 grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center gap-3 border-b border-border/70 px-1 py-3 last:border-b-0">
      <Skeleton className="size-9" />
      <div className="space-y-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-4/5" /></div>
      <Skeleton className="size-4" />
    </div>
  );
}

export function SectionHeading({ title, meta, className }: { title: string; meta?: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3", className)}>
      <h2 className="truncate font-display text-base font-semibold">{title}</h2>
      {meta ? <div className="shrink-0 text-xs text-muted-foreground">{meta}</div> : null}
    </div>
  );
}