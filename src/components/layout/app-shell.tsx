import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Crown, Menu, Search } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { navGroups, navItems } from "@/config/navigation";
import { AccountPanel } from "@/components/layout/account-panel";
import { CommandPalette, CommandPaletteButton, useCommandPalette } from "@/components/command-palette";
import { StudyReminder } from "@/components/study-reminder";
import { useSidebarAttention } from "@/hooks/use-sidebar-attention";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { domain } from "@/domain/active";
import { loadOwnerQuestions } from "@/lib/owner-question-store";
import { loadOwnerLessons } from "@/lib/owner-lesson-store";
import { loadOwnerWork } from "@/lib/owner-work-store";
import { loadLearningPaths } from "@/lib/learning-path-store";
import { firstPracticeTestCertId } from "@/lib/tracks";
import { OWNER_EMAILS } from "@/lib/beta-access.functions";
import { useAuth } from "@/state/auth-state";
import { MaintenanceGate } from "@/components/maintenance-screen";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { accentSurface, featureAccent } from "@/lib/visual-accents";
import { PathLogo } from "@/components/layout/path-logo";
import { useAppState } from "@/state/app-state";

function NavList({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const attention = useSidebarAttention();
  const auth = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const owner = OWNER_EMAILS.includes((auth.email ?? "").trim().toLowerCase());
  const activeGroup = navItems.find((item) => item.to === pathname)?.group;
  const [openGroups, setOpenGroups] = useState<Set<(typeof navGroups)[number]>>(
    () => new Set(["Home", ...(activeGroup ? [activeGroup] : [])] as (typeof navGroups)[number][]),
  );

  useEffect(() => {
    if (!activeGroup) return;
    setOpenGroups((current) => {
      if (current.has(activeGroup)) return current;
      const next = new Set(current);
      next.add(activeGroup);
      return next;
    });
  }, [activeGroup]);

  return (
    <nav className={cn("flex flex-col gap-2 py-4", compact ? "px-2" : "px-3")}>
      {navGroups.map((group) => {
        const items = navItems.filter((item) => item.group === group && (!item.ownerOnly || owner));
        if (!items.length) return null;
        const isOpen = openGroups.has(group);
        const groupAttention = items.reduce((sum, item) => sum + (attention.get(item.to)?.count ?? 0), 0);

        if (compact) {
          return (
            <div key={group}>
              <ul className="space-y-1">
                {items.map((item) => {
                  const needsAttention = attention.get(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onNavigate}
                        title={item.label}
                        aria-label={item.label}
                        activeOptions={{ exact: item.to === "/" }}
                        className="group relative grid size-11 place-items-center rounded-lg border border-transparent text-sidebar-foreground/72 transition hover:border-sidebar-border hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground data-[status=active]:border-sidebar-primary/25 data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-primary data-[status=active]:shadow-[inset_3px_0_0_var(--it-path-cyan)]"
                      >
                        <item.icon className="size-5 transition-transform duration-200 group-hover:scale-110" aria-hidden />
                        {needsAttention ? (
                          <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-primary" aria-label={needsAttention.label} role="status" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        }

        return (
          <div key={group} className="rounded-lg">
            <button
              type="button"
              onClick={() => setOpenGroups((current) => {
                const next = new Set(current);
                if (next.has(group)) next.delete(group);
                else next.add(group);
                return next;
              })}
              className="flex min-h-9 w-full items-center justify-between rounded-md px-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              aria-expanded={isOpen}
            >
              <span>{group}</span>
              <span className="flex items-center gap-2">
                {groupAttention > 0 ? <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">{groupAttention}</span> : null}
                <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} aria-hidden />
              </span>
            </button>
            {isOpen ? (
              <ul className="mt-1 space-y-0.5">
                {items.map((item) => {
                  const needsAttention = attention.get(item.to);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={onNavigate}
                        title={item.description}
                        activeOptions={{ exact: item.to === "/" }}
                        className="group flex min-h-10 items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-sidebar-foreground/72 transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:translate-x-0.5 hover:border-sidebar-border hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground active:scale-[0.98] data-[status=active]:border-sidebar-primary/25 data-[status=active]:bg-sidebar-accent data-[status=active]:font-semibold data-[status=active]:text-sidebar-primary data-[status=active]:shadow-[inset_3px_0_0_var(--it-path-cyan)]"
                      >
                        <span className={cn("grid size-7 shrink-0 place-items-center rounded-md ring-1 ring-inset", accentSurface[featureAccent(item.to)])}>
                          <item.icon className="size-3.5 transition-transform duration-200 group-hover:scale-110" aria-hidden />
                        </span>
                        <span className="flex flex-1 items-center justify-between gap-2">
                          <span>{item.label}</span>
                          <span className="flex items-center gap-1.5">
                            {item.pro ? <Crown className="size-3 text-warning" aria-hidden /> : null}
                            {needsAttention ? (
                              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground" aria-label={needsAttention.label} role="status">
                                {needsAttention.count > 1 ? needsAttention.count : ""}
                              </span>
                            ) : null}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={cn("group flex items-center gap-3 py-5", compact ? "justify-center px-2" : "px-5")}>
      <PathLogo className="size-9 shrink-0 transition-transform duration-150 group-hover:-translate-y-0.5" />
      <span className={cn("min-w-0", compact && "hidden")}>
        <span className="block font-display text-base font-semibold tracking-tight">{domain.appName}</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">
          Your Journey. Your Legacy.
        </span>
      </span>
    </Link>
  );
}

import { GaylBubble } from "@/components/gayl/gayl-bubble";
import { MilestoneOverlay } from "@/components/milestones/milestone-overlay";
import { SidePanel } from "@/components/layout/side-panel";
import { StudyTabs } from "@/components/layout/study-tabs";
import { SyncLiveBadge } from "@/components/sync-live-badge";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const palette = useCommandPalette();
  const { user } = useAppState();
  const [sidebarCompact, setSidebarCompact] = useState(false);

  useEffect(() => {
    try {
      setSidebarCompact(window.localStorage.getItem("itpath.sidebar.compact") === "1");
    } catch {
      setSidebarCompact(false);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCompact((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("itpath.sidebar.compact", next ? "1" : "0");
      } catch {
        // Local storage is optional.
      }
      return next;
    });
  };

  

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Owner spreadsheet questions: load once so pools refresh from the database.
  useEffect(() => {
    void loadOwnerQuestions();
    void loadOwnerLessons();
    void loadOwnerWork();
    void loadLearningPaths();
  }, []);

  const current = navItems.find((i) => i.to === pathname)?.label ?? domain.appName;
  const immersiveBackground = pathname === "/pomodoro" || pathname === "/meditation";
  const virusRun = pathname === "/virus";
  const byteRun = pathname === "/byte-break";
  const virtualPc = pathname === "/virtual-pc";
  const virtualMobile = pathname === "/virtual-mobile";

  // The course chooser is the neutral front door, before either subject loads.
  if (pathname === "/") return <>{children}</>;

  // BYTE//BREAK is a true game surface: no site chrome, page scrolling, tabs,
  // footer, sidebar, or bottom navigation. The game owns the whole viewport.
  if (byteRun || virtualPc) return <MaintenanceGate pathname={pathname}><>{children}</></MaintenanceGate>;

  // Public study guides sit outside the app chrome so search engines and
  // signed-out visitors get a plain, readable page.
  if (
    pathname === "/guides" ||
    pathname.startsWith("/guides/") ||
    pathname === "/tracks" ||
    pathname.startsWith("/tracks/")
  ) {
    return <PublicShell>{children}</PublicShell>;
  }

  return (
    <MaintenanceGate pathname={pathname}>
    <div className="relative min-h-screen">
      {!immersiveBackground ? (
        <>
          <picture className="app-background" aria-hidden>
            <source
              media="(prefers-color-scheme: light)"
              srcSet="/ChatGPT%20Image%20Sep%2024%2C%202026%2C%2010_19_08%20PM.png"
            />
            <img
              className="app-wallpaper-image"
              src="/ChatGPT%20Image%20Sep%2024%2C%202026%2C%2004_42_52%20PM.png"
              alt=""
            />
          </picture>
        </>
      ) : null}
      <StudyReminder />
      <WelcomeTour />
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
      <aside className={cn("sidebar-glass fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto border-r border-sidebar-border transition-[width] duration-200 lg:flex", sidebarCompact ? "w-16" : "w-68")}>
        <div className="relative">
          <Brand compact={sidebarCompact} />
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={sidebarCompact ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCompact ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute right-1 top-1 grid size-7 place-items-center rounded-md text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {sidebarCompact ? <ChevronRight className="size-4" aria-hidden /> : <ChevronLeft className="size-4" aria-hidden />}
          </button>
        </div>
        {sidebarCompact ? (
          <button
            type="button"
            onClick={() => palette.setOpen(true)}
            aria-label="Search"
            title="Search"
            className="mx-auto grid size-11 place-items-center rounded-lg text-sidebar-foreground/72 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Search className="size-5" aria-hidden />
          </button>
        ) : (
          <CommandPaletteButton onClick={() => palette.setOpen(true)} />
        )}
        <NavList compact={sidebarCompact} />
        <div className={cn("mt-auto border-t border-sidebar-border py-4", sidebarCompact ? "px-2" : "px-5")}>
          {sidebarCompact ? (
            <button
              type="button"
              onClick={() => setSidebarCompact(false)}
              className="grid size-11 place-items-center rounded-lg text-xs font-semibold text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title="Open account and sidebar"
              aria-label="Open account and sidebar"
            >
              ME
            </button>
          ) : <AccountPanel />}
        </div>
      </aside>

      <header className={cn("fixed inset-x-0 top-0 z-40 grid h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-background/92 px-2 backdrop-blur-xl lg:hidden", virusRun && "virus-run-shell-header")}>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="sidebar-glass w-72 overflow-y-auto p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Brand />
            <NavList onNavigate={() => setOpen(false)} />
            <div className="border-t border-sidebar-border px-5 py-4">
              <AccountPanel onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <span className="flex min-w-0 items-center gap-2 truncate font-display text-sm font-semibold">
          <PathLogo className="size-5" />
          <span className="truncate">{domain.appName}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">· {current}</span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          onClick={() => palette.setOpen(true)}
        >
          <Search className="size-5" />
        </Button>
      </header>

      <main className={cn("relative z-10 pb-16 pt-12 transition-[padding] duration-200 lg:pb-0 lg:pt-0", sidebarCompact ? "lg:pl-16" : "lg:pl-68", virusRun && "virus-run-shell-main")}>
        <div className={cn(
          immersiveBackground
            ? "w-full p-0"
            : "mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8",
        )}>
          {!immersiveBackground ? <StudyTabs /> : null}
          {!immersiveBackground && domain.id !== "auto-repair" ? (
            <div className="mb-4 flex items-center gap-3" aria-hidden>
              <div className="h-[3px] w-14 rounded-full bg-[var(--it-path-gradient)] shadow-[0_0_14px_color-mix(in_srgb,var(--it-path-violet)_20%,transparent)]" />
              <div className="h-px flex-1 bg-border/45" />
            </div>
          ) : null}
          <div key={pathname} className={cn(!immersiveBackground && "page-enter")} data-page-content>
            {children}
          </div>
        </div>
        <MilestoneOverlay />
        {user.settings.showGaylBubble !== false ? <GaylBubble /> : null}
        {user.settings.showBrainBubble !== false ? <SidePanel /> : null}
        <SyncLiveBadge />
        <footer className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
            <span>{domain.appName} · David Boley</span>
            <Link
              to="/practice-tests/$certId"
              params={{ certId: firstPracticeTestCertId() }}
              className="hover:text-foreground"
            >
              Free Practice Tests
            </Link>
            <Link to="/terms" className="hover:text-foreground">
              Terms of Use
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              Privacy Notice
            </Link>
            <Link to="/refund-policy" className="hover:text-foreground">
              Refunds
            </Link>
            <Link to="/about" className="hover:text-foreground">
              About
            </Link>
          </div>
        </footer>
      </main>
      <div className={cn(virusRun && "virus-run-shell-bottom-nav")}><MobileBottomNav onMore={() => setOpen(true)} /></div>
    </div>
    </MaintenanceGate>
  );
}

/** Plain, crawlable layout for public pages. No sidebar, no learner state. */
function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Start free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">{children}</main>

      <footer className="mx-auto w-full max-w-4xl px-4 pb-12 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
          <span>{domain.appName} · David Boley</span>
          <Link to="/guides" className="hover:text-foreground">
            All study guides
          </Link>
          <Link
            to="/practice-tests/$certId"
            params={{ certId: firstPracticeTestCertId() }}
            className="hover:text-foreground"
          >
            Free Practice Tests
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms of Use
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy Notice
          </Link>
        </div>
      </footer>
    </div>
  );
}
