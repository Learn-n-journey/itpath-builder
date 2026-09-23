import { Link, useRouterState } from "@tanstack/react-router";
import { Award, BookOpen, LayoutDashboard, Menu, Route as RouteIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { accentText, featureAccent } from "@/lib/visual-accents";

const items = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "My Path", to: "/my-path", icon: RouteIcon },
  { label: "Learn", to: "/learn", icon: BookOpen },
  { label: "Certifications", to: "/certifications", icon: Award },
] as const;

export function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid h-16 grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.to || (item.to === "/certifications" && pathname.startsWith("/certifications/"));
          return (
            <Link key={item.to} to={item.to} className={cn("flex min-w-0 flex-col items-center justify-center gap-1 text-[0.625rem] text-muted-foreground", active && "text-primary")}>
              <item.icon className={cn("size-4.5 shrink-0", active ? "text-primary" : accentText[featureAccent(item.to)])} aria-hidden />
              <span className="max-w-full truncate px-1">{item.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={onMore} className="flex min-w-0 flex-col items-center justify-center gap-1 text-[0.625rem] text-muted-foreground" aria-label="Open more navigation">
          <Menu className="size-4.5 shrink-0" aria-hidden />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}