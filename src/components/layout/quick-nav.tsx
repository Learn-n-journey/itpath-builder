import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, X } from "lucide-react";
import { useEffect, useState } from "react";

import { navItems } from "@/config/navigation";
import { useSidebarAttention } from "@/hooks/use-sidebar-attention";
import { cn } from "@/lib/utils";

/** The handful of places learners jump between most often. */
const QUICK_PATHS = [
  "/learn",
  "/quiz-me",
  "/daily-challenge",
  "/review",
  "/practice",
  "/weak-areas",
  "/my-path",
  "/progress",
  "/",
];

const quickItems = QUICK_PATHS.map((path) =>
  navItems.find((item) => item.to === path),
).filter((item): item is (typeof navItems)[number] => Boolean(item));

export function QuickNav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const attention = useSidebarAttention();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed bottom-5 left-4 z-40 flex flex-col items-start gap-3 lg:left-[17.5rem]">
      <div
        className={cn(
          "origin-bottom-left transition-all duration-200 ease-out",
          open
            ? "pointer-events-auto visible translate-y-0 scale-100 opacity-100"
            : "pointer-events-none invisible translate-y-2 scale-95 opacity-0",
        )}
      >
        <div className="w-60 rounded-2xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur">
          <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Jump to
          </p>
          <ul className="space-y-0.5">
            {quickItems.map((item) => {
              const needsAttention = attention.get(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    activeOptions={{ exact: item.to === "/" }}
                    className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground/85 transition-colors hover:bg-accent hover:text-accent-foreground data-[status=active]:bg-accent data-[status=active]:font-medium data-[status=active]:text-primary"
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    <span className="flex flex-1 items-center justify-between gap-2">
                      {item.label}
                      {needsAttention ? (
                        <span
                          className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
                          aria-label={needsAttention.label}
                          role="status"
                        >
                          {needsAttention.count > 1 ? needsAttention.count : ""}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close quick menu" : "Open quick menu"}
        aria-expanded={open}
        className={cn(
          "pointer-events-auto flex size-14 items-center justify-center rounded-full border border-border bg-card text-primary shadow-xl transition-all duration-200 ease-out hover:scale-105 active:scale-90 sm:size-12",
          open && "scale-95 border-primary/60",
        )}
      >
        {open ? <X className="size-5" aria-hidden /> : <Compass className="size-5" aria-hidden />}
      </button>
    </div>
  );
}
