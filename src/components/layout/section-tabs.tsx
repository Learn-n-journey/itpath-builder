import { Link, useRouterState } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export interface SectionTab {
  to: string;
  label: string;
}

/**
 * A small tab strip for pages that belong together, so related views live under
 * one menu entry instead of several.
 */
export function SectionTabs({ tabs, variant = "pills" }: { tabs: SectionTab[]; variant?: "pills" | "segmented" }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className={cn("mb-5", variant === "segmented" ? "grid w-full grid-cols-2 overflow-hidden rounded-full border border-border bg-card/70" : "flex gap-2 overflow-x-auto pb-1")} aria-label="Section views">
      {tabs.map((tab) => {
        const active = pathname === tab.to;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              variant === "segmented"
                ? "min-w-0 px-3 py-2.5 text-center text-sm font-medium transition-[color,background-color,transform] duration-150 first:border-r first:border-border active:scale-[0.98]"
                : "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98]",
              active
                ? variant === "segmented" ? "bg-primary text-primary-foreground" : "border-primary bg-primary text-primary-foreground shadow-sm"
                : variant === "segmented" ? "text-muted-foreground hover:text-foreground" : "border-border bg-card/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const PROGRESS_TABS: SectionTab[] = [
  { to: "/progress", label: "Progress" },
  { to: "/insights", label: "Trends" },
  { to: "/learner", label: "Learner profile" },
  { to: "/career-skills", label: "Career skills" },
];

export const REVIEW_TABS: SectionTab[] = [
  { to: "/review", label: "Review schedule" },
  { to: "/weak-areas", label: "Weak areas" },
];

export const PATH_TABS: SectionTab[] = [
  { to: "/my-path", label: "My Path" },
  { to: "/journey", label: "Journey map" },
];

export const ABOUT_TABS: SectionTab[] = [
  { to: "/about", label: "About IT PATH" },
  { to: "/meet-gayl", label: "Meet GAYL" },
];
