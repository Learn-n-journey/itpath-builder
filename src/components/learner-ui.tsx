import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export function CompactStats({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-3 divide-x divide-border border-y border-border py-3", className)}>{children}</div>;
}

export function CompactStat({ value, label, icon: Icon }: { value: ReactNode; label: string; icon?: LucideIcon }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="size-4 shrink-0 text-primary" aria-hidden /> : null}
        <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
      </div>
      <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">{label}</p>
    </div>
  );
}

export function ProgressLine({ value, label, className }: { value: number; label?: string; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3", className)}>
      <div className="min-w-0">
        {label ? <p className="mb-1 truncate text-xs text-muted-foreground">{label}</p> : null}
        <Progress value={value} className="h-1.5" />
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
  className,
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  metadata?: ReactNode;
  progress?: number;
  status?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 px-1 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/35", selected && "bg-primary/8", className)}>
      {Icon ? <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-primary"><Icon className="size-4" aria-hidden /></span> : <span />}
      <div className="min-w-0">
        {eyebrow ? <p className="truncate text-[0.6875rem] font-medium text-primary">{eyebrow}</p> : null}
        <p className="truncate text-sm font-semibold">{title}</p>
        {description ? <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">{description}</p> : null}
        {metadata ? <div className="mt-1 text-[0.6875rem] text-muted-foreground">{metadata}</div> : null}
        {typeof progress === "number" ? <ProgressLine value={progress} className="mt-2" /> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status}
        {trailing ?? <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
      </div>
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