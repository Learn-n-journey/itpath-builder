import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { navGroups, navItems } from "@/config/navigation";
import { useAppState } from "@/state/app-state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

function NavList({ onNavigate }: { onNavigate?: () => void }) {
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
              .map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    activeOptions={{ exact: item.to === "/" }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:font-medium data-[status=active]:text-sidebar-primary"
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
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
      <span className="font-display text-base font-semibold tracking-tight">IT PATH</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hydrated } = useAppState();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const current = navItems.find((i) => i.to === pathname)?.label ?? "IT PATH";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto px-5 py-4 text-xs text-muted-foreground">
          {hydrated ? "Saved locally on this device" : "Loading your data…"}
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Brand />
            <NavList onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="font-display text-sm font-semibold">{current}</span>
      </header>

      <main className={cn("lg:pl-64")}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
