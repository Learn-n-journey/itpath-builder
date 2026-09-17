/**
 * Study tabs.
 *
 * Tabs never open on their own. A "+" button at the end of the tab strip
 * opens a menu of study pages, and picking one opens it as a tab so you can
 * jump to Second Brain or the AI Tutor and come straight back to where you
 * were. Only study pages can be opened as tabs, so the tab bar never turns
 * into a copy of the whole menu.
 */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { topics } from "@/data/static-content";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "itpath.tabs.v1";

/** Pages that can be opened as tabs from the "+" button. */
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

/** A label for any page that is allowed to sit in a tab, or null. */
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

function writeTabs(tabs: StudyTab[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    /* storage is optional */
  }
}

export function StudyTabs() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigate = useNavigate();
  const [tabs, setTabs] = useState<StudyTab[]>([]);

  const openTab = useCallback(
    (path: string) => {
      const label = studyLabel(path);
      if (!label) return;
      setTabs((current) => {
        if (current.some((tab) => tab.path === path)) return current;
        const next = [...current, { path, label }].slice(-8);
        writeTabs(next);
        return next;
      });
      void navigate({ to: path });
    },
    [navigate],
  );

  const close = useCallback(
    (path: string) => {
      setTabs((current) => {
        const next = current.filter((tab) => tab.path !== path);
        writeTabs(next);
        if (path === pathname) {
          const fallback = next[next.length - 1]?.path ?? "/";
          void navigate({ to: fallback });
        }
        return next;
      });
    },
    [navigate, pathname],
  );

  const openPages = STUDY_PAGES.filter((page) => !tabs.some((tab) => tab.path === page.path));

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open a study tab"
              title="Open a study tab"
              className="size-7 rounded-md border border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            >
              <Plus className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Open a tab</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {openPages.length === 0 ? (
              <DropdownMenuItem disabled>Every study page is already open</DropdownMenuItem>
            ) : (
              openPages.map((page) => (
                <DropdownMenuItem key={page.path} onSelect={() => openTab(page.path)}>
                  {page.label}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
