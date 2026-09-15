import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Sparkles } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import type { NextAction } from "@/lib/next-action";

export function ActionLink({
  action,
  children,
  className,
}: {
  action: NextAction;
  children: React.ReactNode;
  className?: string;
}) {
  if (action.to === "/topics/$topicId" && action.topicId) {
    return (
      <Link to="/topics/$topicId" params={{ topicId: action.topicId }} className={className}>
        {children}
      </Link>
    );
  }
  const to = action.to === "/topics/$topicId" ? "/learn" : action.to;
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}

/** One recommendation, chosen from recorded evidence, with the alternatives below. */
export function NextActionCard({
  actions,
  className,
}: {
  actions: NextAction[];
  className?: string;
}) {
  const [primary, ...rest] = actions;
  if (!primary) return null;

  return (
    <Panel
      className={className}
      title="Do this next"
      description="Chosen from your own records, due reviews, open work and the gaps between what you know and what you have proven."
    >
      <div className="rounded-lg bg-secondary/50 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{primary.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{primary.reason}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              About {primary.minutes} minutes
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Button asChild size="sm">
            <ActionLink action={primary}>
              Start now
              <ArrowRight className="size-4" aria-hidden />
            </ActionLink>
          </Button>
        </div>
      </div>

      {rest.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Or, next in line
          </p>
          <ul className="mt-2 space-y-1.5">
            {rest.slice(0, 3).map((action) => (
              <li key={action.id}>
                <ActionLink
                  action={action}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{action.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {action.reason}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {action.minutes}m
                  </span>
                </ActionLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}
