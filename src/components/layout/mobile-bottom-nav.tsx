import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, ClipboardList, Home, Menu, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { accentText, featureAccent } from "@/lib/visual-accents";

const items = [
  { label: "Home", to: "/dashboard", icon: Home },
  { label: "Learn", to: "/learn", icon: BookOpen },
  { label: "Practice", to: "/practice", icon: ClipboardList },
  { label: "Community", to: "/community", icon: Users },
] as const;

export function MobileBottomNav({ onMore }: { onMore: () => void }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid h-16 grid-cols-5">
        {items.map((item) => {
          const active = pathname === item.to;
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