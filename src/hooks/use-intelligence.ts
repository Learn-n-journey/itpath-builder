import { useMemo } from "react";

import { useAppState } from "@/state/app-state";
import { buildIntelligence } from "@/lib/intelligence/engine";
import type { Intelligence } from "@/lib/intelligence/types";

/**
 * The single learning-intelligence model. Memoised on the user record, so every
 * screen that asks gets the same answer and it refreshes after each interaction.
 */
export function useIntelligence(): Intelligence {
  const { user } = useAppState();
  return useMemo(() => buildIntelligence(user), [user]);
}
