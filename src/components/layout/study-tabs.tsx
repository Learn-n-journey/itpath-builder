/**
 * Study tabs.
 *
 * Tabs never open on their own. A "+" button at the end of the tab strip
 * opens a menu of study pages, and picking one opens it as a tab in
 * addition to the page you are already on: the current page stays in the
 * strip and the new tab opens beside it. Only study pages can be opened as
 * tabs, so the tab bar never turns into a copy of the whole menu.
 */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
  { path: "/virus", label: "Virus Run" },
  { path: "/weak-areas", label: "Weak Areas" },
  { path: "/daily-challenge", label: "Daily Challenge" },
  { path: "/study-plan", label: "Study Plan" },
  { path: "/bookmarks", label: "Saved and notes" },
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Restore the tabs the learner had open before a reload. Done in an
  // effect, not the state initializer, so server and client markup match.
  useEffect(() => {
    setTabs(readTabs());
  }, []);

  const openTab = useCallback(
    (path: string) => {
      const label = studyLabel(path);
      if (!label) return;
      const currentLabel = studyLabel(pathname);
      setTabs((current) => {
        let next = current;
        // Keep the page you are on as a tab, so the new one sits beside it.
        if (currentLabel && !next.some((tab) => tab.path === pathname)) {
          next = [...next, { path: pathname, label: currentLabel }];
        }
        if (!next.some((tab) => tab.path === path)) {
          next = [...next, { path, label }];
        }
        next = next.slice(-8);
        writeTabs(next);
        return next;
      });
      void navigate({ to: path });
    },
    [navigate, pathname],
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

  const openPages = STUDY_PAGES.filter(
    (page) => page.path !== pathname && !tabs.some((tab) => tab.path === page.path),
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5">
      {tabs.map((tab) => {
        const active = tab.path === pathname;
        return (
          <span
            key={tab.path}
            className={cn(
              "group flex max-w-[15rem] items-center gap-1 rounded-full border py-1 pl-3.5 pr-1.5 text-xs font-medium shadow-sm transition-all duration-200",
              active
                ? "border-primary/50 bg-primary text-primary-foreground shadow-primary/20"
                : "border-border bg-card/70 text-muted-foreground hover:border-primary/40 hover:bg-card hover:text-foreground",
            )}
          >
            <Link to={tab.path} className="truncate">
              {tab.label}
            </Link>
            <button
              type="button"
              aria-label={`Close ${tab.label}`}
              onClick={() => close(tab.path)}
              className={cn(
                "flex size-4.5 shrink-0 items-center justify-center rounded-full transition-colors",
                active
                  ? "text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground"
                  : "text-muted-foreground/60 hover:bg-muted hover:text-foreground",
              )}
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        );
      })}
      <div className="relative">
        <button
          type="button"
          aria-label="Open a study tab"
          title="Open a study tab"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-7 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary"
        >
          <Plus className="size-4" aria-hidden />
        </button>
        {menuOpen ? (
          <>
            <button
              type="button"
              aria-label="Close the menu"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute left-0 z-50 mt-1.5 max-h-72 w-56 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg">
              <p className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">Open a tab</p>
              {openPages.length === 0 ? (
                <p className="px-2.5 py-1.5 text-xs text-muted-foreground">Every study page is already open</p>
              ) : (
                openPages.map((page) => (
                  <button
                    key={page.path}
                    type="button"
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    onClick={() => {
                      setMenuOpen(false);
                      openTab(page.path);
                    }}
                  >
                    {page.label}
                  </button>
                ))
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
