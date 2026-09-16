/**
 * Study tabs.
 *
 * Opening another study page while you are mid lesson keeps the lesson in a
 * tab, so you can jump to Second Brain or the AI Tutor and come straight back
 * to where you were. Only study pages open as tabs, so the tab bar never turns
 * into a copy of the whole menu.
 */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/layout/side-panel";
import { topics } from "@/data/static-content";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "itpath.tabs.v1";

/** Pages worth keeping open side by side while studying. */
const STUDY_PAGES: { path: string; label: string }[] = [
  { path: "/learn", label: "Learn" },
  { path: "/knowledge", label: "Second Brain" },
  { path: "/ai-tutor", label: "AI Tutor" },
  { path: "/review", label: "Review" },
  { path: "/practice", label: "Practice" },
  { path: "/quiz-me", label: "Quiz Me" },
  { path: "/labs", label: "Labs" },
  { path: "/command-line", label: "Command Line" },
  { path: "/explore-hardware", label: "Hardware Explorer" },
  { path: "/weak-areas", label: "Weak Areas" },
  { path: "/daily-challenge", label: "Daily Challenge" },
  { path: "/study-plan", label: "Study Plan" },
  { path: "/notes", label: "Notes" },
];

export interface StudyTab {
  path: string;
  label: string;
}

/** A label for any page that is allowed to open as a tab, or null. */
function studyLabel(pathname: string): string | null {
  const known = STUDY_PAGES.find((page) => page.path === pathname);
  if (known) return known.label;
  if (pathname.startsWith("/topics/")) {
    const id = pathname.slice("/topics/".length);
    return topics.find((topic) => topic.id === id)?.title ?? "Lesson";
  }
  return null;
}

function readTabs(): StudyTab[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StudyTab[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((tab) => typeof tab?.path === "string" && typeof tab?.label === "string").slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

export function StudyTabs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<StudyTab[]>([]);

  useEffect(() => {
    setTabs(readTabs());
  }, []);

  useEffect(() => {
    const label = studyLabel(pathname);
    if (!label) return;
    setTabs((current) => {
      if (current.some((tab) => tab.path === pathname)) return current;
      const next = [...current, { path: pathname, label }].slice(-8);
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage is optional */
      }
      return next;
    });
  }, [pathname]);

  const close = useCallback(
    (path: string) => {
      setTabs((current) => {
        const next = current.filter((tab) => tab.path !== path);
        try {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* storage is optional */
        }
        if (path === pathname) {
          const fallback = next[next.length - 1]?.path ?? "/";
          void navigate({ to: fallback });
        }
        return next;
      });
    },
    [navigate, pathname],
  );

  const showTabs = tabs.length > 1;

  if (!showTabs) return <SidePanel className="mb-4" />;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {tabs.map((tab) => {
          const active = tab.path === pathname;
          return (
            <span
              key={tab.path}
              className={cn(
                "group flex max-w-[15rem] items-center gap-1 rounded-t-md border border-b-0 px-2.5 py-1.5 text-xs transition-colors",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
            >
              <Link to={tab.path} className="truncate">
                {tab.label}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="size-5 shrink-0 opacity-60 hover:opacity-100"
                aria-label={`Close ${tab.label}`}
                onClick={() => close(tab.path)}
              >
                <X className="size-3" aria-hidden />
              </Button>
            </span>
          );
        })}
      </div>
      <SidePanel />
    </div>
  );
}
