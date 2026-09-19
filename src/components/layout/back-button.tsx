import { useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { navItems } from "@/config/navigation";
import { cn } from "@/lib/utils";

interface VisitedPage {
  path: string;
  label: string;
}

type PageHistory = Record<string, VisitedPage>;

const HISTORY_KEY = "it-path-page-history-v2";

function pageLabel(path: string) {
  const navLabel = navItems.find((item) => item.to === path)?.label;
  if (navLabel) return navLabel;

  const title = document.title.split("|")[0]?.trim();
  return title || "Previous page";
}

function readHistory(): PageHistory {
  try {
    const value = JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? "[]");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function browserHistoryIndex(): number | null {
  const state: unknown = window.history.state;
  if (!state || typeof state !== "object" || !("__TSR_index" in state)) return null;
  const index = state.__TSR_index;
  return typeof index === "number" ? index : null;
}

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [previousPage, setPreviousPage] = useState<VisitedPage>({ path: "/", label: "Dashboard" });
  const [pageHasOwnBackLink, setPageHasOwnBackLink] = useState(false);

  useEffect(() => {
    const visited = readHistory();
    const historyIndex = browserHistoryIndex();
    const current: VisitedPage = { path: pathname, label: pageLabel(pathname) };

    if (historyIndex === null) {
      setPreviousPage({ path: "/", label: "Dashboard" });
      return;
    }

    visited[String(historyIndex)] = current;
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(visited));
    setPreviousPage(visited[String(historyIndex - 1)] ?? { path: "/", label: "Dashboard" });
  }, [pathname]);

  useEffect(() => {
    const content = document.querySelector("[data-page-content]");
    if (!content) {
      setPageHasOwnBackLink(false);
      return;
    }

    const checkForBackLink = () => {
      const links = Array.from(content.querySelectorAll("a, button"));
      setPageHasOwnBackLink(
        links.some((element) => {
          const text = element.textContent?.trim() ?? "";
          return /^(back|return)\b/i.test(text) || element.querySelector(".lucide-arrow-left") !== null;
        }),
      );
    };

    checkForBackLink();
    const observer = new MutationObserver(checkForBackLink);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  if (pathname === "/" || pageHasOwnBackLink) return null;

  const goBack = () => {
    const visited = readHistory();
    const historyIndex = browserHistoryIndex();
    const browserPreviousPage = historyIndex === null ? undefined : visited[String(historyIndex - 1)];

    if (browserPreviousPage?.path === previousPage.path) {
      window.history.back();
      return;
    }

    void router.navigate({ href: previousPage.path });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={goBack}
      aria-label={`Back to ${previousPage.label}`}
      className={cn("-ml-2 gap-2 text-muted-foreground hover:text-foreground", className)}
    >
      <ArrowLeft className="size-4" aria-hidden />
      Back to {previousPage.label}
    </Button>
  );
}
