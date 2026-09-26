import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Crown, Menu, Search, ShieldCheck } from "lucide-react";
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
    <nav className="flex flex-col gap-2 px-3 py-4">
      {navGroups.map((group) => {
        const items = navItems.filter((item) => item.group === group && (!item.ownerOnly || owner));
        if (!items.length) return null;
        const isOpen = openGroups.has(group);
        const groupAttention = items.reduce((sum, item) => sum + (attention.get(item.to)?.count ?? 0), 0);

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
                        className="group flex min-h-10 items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm text-sidebar-foreground/72 transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:translate-x-0.5 hover:border-sidebar-border hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground active:scale-[0.98] data-[status=active]:border-sidebar-primary/25 data-[status=active]:bg-sidebar-accent data-[status=active]:font-semibold data-[status=active]:text-sidebar-primary data-[status=active]:shadow-[inset_3px_0_0_var(--color-sidebar-primary)]"
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

