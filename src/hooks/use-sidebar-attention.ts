import { useMemo } from "react";

import { useAppStateOptional } from "@/state/app-state";
import { sidebarAttention, type SidebarAttention } from "@/lib/sidebar-attention";

/** Attention indicators for the sidebar, derived from the learner's real records. */
export function useSidebarAttention(): Map<string, SidebarAttention> {
  const ctx = useAppStateOptional();
  const user = ctx?.user;

  return useMemo(() => {
    const map = new Map<string, SidebarAttention>();
    if (!user) return map;
    for (const item of sidebarAttention(user)) {
      map.set(item.to, item);
    }
    return map;
  }, [user]);
}
