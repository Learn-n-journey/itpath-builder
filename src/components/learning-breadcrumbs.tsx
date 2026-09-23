import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type LearningCrumb = {
  label: string;
  to?: string;
  params?: Record<string, string>;
};

export function LearningBreadcrumbs({ items, className }: { items: LearningCrumb[]; className?: string }) {
  return (
    <nav aria-label="Learning path" className={cn("mb-3 overflow-hidden", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 ? <ChevronRight className="size-3 shrink-0 opacity-60" aria-hidden /> : null}
            {item.to ? (
              <Link
                to={item.to}
                {...(item.params ? { params: item.params as never } : {})}
                className="truncate transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate text-foreground/75" aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}