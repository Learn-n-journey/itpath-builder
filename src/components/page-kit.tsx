import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { HelpTip } from "@/components/help-tip";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="motion-content-enter mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  help,
  children,
  className,
  id,
}: {
  title?: string;
  description?: string;
  help?: ReactNode;
  children?: ReactNode;
  className?: string | undefined;
  /** Lets other parts of the page link straight to this panel. */
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 border-t border-border/60 pt-4", className)}>
      {title ? <div className="flex items-center gap-1.5"><h2 className="font-display text-lg font-semibold">{title}</h2>{help ? <HelpTip label={`About ${title}`}>{help}</HelpTip> : null}</div> : null}
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {children ? <div className={title ? "mt-3" : undefined}>{children}</div> : null}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="min-w-0 py-1.5" data-icon={Icon ? "1" : undefined}>
      <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-foreground/80">{label}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon: Icon,
  children,
}: {
  title: string;
  body?: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-6 text-center">
      {Icon ? (
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-secondary text-emphasis">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {body ? <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function LearnerPageSkeleton({
  rows = 5,
  metrics = 4,
  detail = false,
}: {
  rows?: number;
  metrics?: number;
  detail?: boolean;
}) {
  return (
    <div className="animate-in fade-in duration-150" aria-label="Loading page" aria-busy="true">
      <div className="mb-5 space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid divide-x divide-border border-y border-border py-3" style={{ gridTemplateColumns: `repeat(${metrics}, minmax(0, 1fr))` }}>
        {Array.from({ length: metrics }).map((_, index) => (
          <div key={index} className="space-y-2 px-3 first:pl-0 last:pr-0">
            <Skeleton className="h-6 w-10" />
            <Skeleton className="h-3 w-full max-w-20" />
          </div>
        ))}
      </div>
      <div className={cn("mt-5 grid items-start gap-5", detail && "xl:grid-cols-[20rem_minmax(0,1fr)]")}>
        <div className="divide-y divide-border/70 border-t border-border/60">
          {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="grid min-h-16 grid-cols-[2.25rem_minmax(0,1fr)_1rem] items-center gap-3 py-3">
              <Skeleton className="size-9" />
              <div className="space-y-2"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-4/5" /></div>
              <Skeleton className="size-4" />
            </div>
          ))}
        </div>
        {detail ? <div className="space-y-3 border-t border-border/60 pt-4"><Skeleton className="h-6 w-2/5" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-28 w-full" /></div> : null}
      </div>
    </div>
  );
}
