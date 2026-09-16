import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

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
    <header className="motion-content-enter mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border/70 pb-5">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2" aria-hidden>
          <span className="h-1.5 w-1.5 bg-primary" />
          <span className="h-px w-8 technical-rule" />
        </div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={cn("panel motion-surface p-5 sm:p-6", className)}>
      {title ? (
        <div className="flex items-center gap-2">
          <span className="h-3 w-0.5 shrink-0 bg-primary/70" aria-hidden />
          <h2 className="font-display text-base font-semibold">{title}</h2>
        </div>
      ) : null}
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {children ? <div className={title ? "mt-4" : undefined}>{children}</div> : null}
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
    <div className="panel motion-surface group p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary/50 text-primary transition-colors duration-200 group-hover:border-primary/30">
            <Icon className="size-4" aria-hidden />
          </span>
        ) : null}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</p>
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
  body: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <div className="panel motion-surface flex flex-col items-center px-6 py-12 text-center">
      {Icon ? (
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
