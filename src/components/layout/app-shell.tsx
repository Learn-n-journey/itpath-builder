import { Link, useRouterState } from "@tanstack/react-router";
import { Crown, Menu, Search, ShieldCheck } from "lucide-react";
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

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const attention = useSidebarAttention();
  const auth = useAuth();
  const owner = OWNER_EMAILS.includes((auth.email ?? "").trim().toLowerCase());

  return (
    <nav className="flex flex-col gap-7 px-3 py-5">
      {navGroups.map((group) => (
        <div key={group}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {group}
          </p>
          <ul className="space-y-0.5">
            {navItems
              .filter((item) => item.group === group && (!item.ownerOnly || owner))
              .map((item) => {
                const needsAttention = attention.get(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={item.description}
                      activeOptions={{ exact: item.to === "/" }}
                      className="group flex min-h-10 items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-sidebar-foreground/72 transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:translate-x-0.5 hover:border-sidebar-border hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground active:scale-[0.98] data-[status=active]:border-sidebar-primary/25 data-[status=active]:bg-sidebar-accent data-[status=active]:font-semibold data-[status=active]:text-sidebar-primary data-[status=active]:shadow-[inset_3px_0_0_var(--color-sidebar-primary)]"
                    >
                      <span className={cn("grid size-7 shrink-0 place-items-center rounded-md ring-1 ring-inset", accentSurface[featureAccent(item.to)])}>
                        <item.icon className="size-3.5 transition-transform duration-200 group-hover:scale-110" aria-hidden />
                      </span>
                      <span className="flex flex-1 items-center justify-between gap-2">
                        <span>{item.label}</span>
                        <span className="flex items-center gap-1.5">
                          {item.pro ? (
                            <Crown className="size-3 text-warning" aria-hidden />
                          ) : null}
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
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/" className="group flex items-center gap-3 px-5 py-5">
      <span className="flex size-9 items-center justify-center rounded-md border border-primary/25 bg-primary/12 text-primary shadow-sm transition-transform duration-150 group-hover:-translate-y-0.5">
        <ShieldCheck className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0">
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

  // The course chooser is the neutral front door, before either subject loads.
  if (pathname === "/") return <>{children}</>;

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
      <aside className="sidebar-glass fixed inset-y-0 left-0 z-30 hidden w-68 flex-col overflow-y-auto border-r border-sidebar-border lg:flex">
        <Brand />
        <CommandPaletteButton onClick={() => palette.setOpen(true)} />
        <NavList />
        <div className="mt-auto border-t border-sidebar-border px-5 py-4">
          <AccountPanel />
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 grid h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border bg-background/92 px-2 backdrop-blur-xl lg:hidden">
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
          <ShieldCheck className="size-5 shrink-0 text-primary" aria-hidden />
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

      <main className={cn("relative z-10 pb-16 pt-12 lg:pl-68 lg:pb-0 lg:pt-0")}>
        <div className={cn(
          immersiveBackground
            ? "w-full p-0"
            : "mx-auto w-full max-w-6xl px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8",
        )}>
          {!immersiveBackground ? <StudyTabs /> : null}
          <div key={pathname} className={cn(!immersiveBackground && "page-enter")} data-page-content>
            {children}
          </div>
        </div>
        <MilestoneOverlay />
        <div className="hidden lg:block"><GaylBubble /></div>
        <div className="hidden lg:block"><SidePanel /></div>
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
      <MobileBottomNav onMore={() => setOpen(true)} />
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
