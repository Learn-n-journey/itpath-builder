import { useMemo } from "react";

import { buildLearnerModel, type LearnerModel } from "@/lib/learner-model";
import { useAppState } from "@/state/app-state";

/**
 * The learner profile, rebuilt whenever recorded activity changes.
 * Hydration-safe: the clock is read once per rebuild, not per render.
 */
export function useLearnerModel(): LearnerModel {
  const { user } = useAppState();
  return useMemo(() => buildLearnerModel(user), [user]);
}
