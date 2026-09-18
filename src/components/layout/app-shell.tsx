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

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const attention = useSidebarAttention();

  return (
    <nav className="flex flex-col gap-6 px-3 py-4">
      {navGroups.map((group) => (
        <div key={group}>
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {group}
          </p>
          <ul className="space-y-0.5">
            {navItems
              .filter((item) => item.group === group)
              .map((item) => {
                const needsAttention = attention.get(item.to);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={item.description}
                      activeOptions={{ exact: item.to === "/" }}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-all duration-200 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:scale-[0.98] data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-primary"
                    >
                      <item.icon className="size-4 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden />
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
    <Link to="/" className="flex items-center gap-2.5 px-5 py-4">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <ShieldCheck className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-base font-semibold tracking-tight">IT PATH</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">
          Your Journey. Your Legacy.
        </span>
      </span>
    </Link>
  );
}

import { GaylBubble } from "@/components/gayl/gayl-bubble";
import { MilestoneOverlay } from "@/components/milestones/milestone-overlay";
import { BackButton } from "@/components/layout/back-button";
import { QuickNav } from "@/components/layout/quick-nav";
import { SidePanel } from "@/components/layout/side-panel";
import { StudyTabs } from "@/components/layout/study-tabs";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const palette = useCommandPalette();

  

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const current = navItems.find((i) => i.to === pathname)?.label ?? "IT PATH";

  // Public study guides sit outside the app chrome so search engines and
  // signed-out visitors get a plain, readable page.
  if (pathname === "/guides" || pathname.startsWith("/guides/")) {
    return <PublicShell>{children}</PublicShell>;
  }

  return (
    <div className="min-h-screen bg-background">
      <StudyReminder />
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
      <aside className="sidebar-glass fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-sidebar-border lg:flex">
        <Brand />
        <CommandPaletteButton onClick={() => palette.setOpen(true)} />
        <NavList />
        <div className="mt-auto border-t border-sidebar-border px-5 py-4">
          <AccountPanel />
        </div>
      </aside>

      <header className="sticky top-0 z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/85 px-4 py-3 shadow-sm backdrop-blur-xl lg:hidden">
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
          <span className="h-1.5 w-1.5 shrink-0 bg-emphasis" aria-hidden />
          {current}
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

      <main className={cn("lg:pl-64")}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <BackButton className="mb-4" />
          <StudyTabs />
          <div key={pathname} className="page-enter">
            {children}
          </div>
          <div className="mt-10 border-t border-border pt-4">
            <BackButton />
          </div>
        </div>
        <MilestoneOverlay />
        <GaylBubble />
        <SidePanel />
        <QuickNav />
        <footer className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
            <span>IT PATH · David Boley</span>
            <Link
              to="/practice-tests/$certId"
              params={{ certId: "cert-comptia-a-plus" }}
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
    </div>
  );
}
