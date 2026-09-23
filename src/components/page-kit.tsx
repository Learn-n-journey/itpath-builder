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
  children,
  className,
  id,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string | undefined;
  /** Lets other parts of the page link straight to this panel. */
  id?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24 border-t border-border/60 pt-4", className)}>
      {title ? <h2 className="font-display text-lg font-semibold">{title}</h2> : null}
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
  body: string;
  icon?: LucideIcon;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon ? (
        <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-secondary text-emphasis">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
