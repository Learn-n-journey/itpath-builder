import { useSyncExternalStore } from "react";

import { subscribeOwnerLessons, ownerLessonVersion } from "@/lib/owner-lesson-store";
import { subscribeOwnerWork, ownerWorkVersion } from "@/lib/owner-work-store";
import { subscribeOwnerQuestions, ownerPoolVersion } from "@/lib/owner-question-store";

/**
 * Re-renders the caller whenever owner workbook content finishes loading, so a
 * page opened before the load lands swaps to the owner's own material instead
 * of keeping the built-in fallback until the next visit.
 */
export function useOwnerContentVersion(): number {
  return useSyncExternalStore(
    (listener) => {
      const offLessons = subscribeOwnerLessons(listener);
      const offWork = subscribeOwnerWork(listener);
      const offQuestions = subscribeOwnerQuestions(listener);
      return () => {
        offLessons();
        offWork();
        offQuestions();
      };
    },
    () => ownerLessonVersion() + ownerWorkVersion() + ownerPoolVersion(),
    () => 0,
  );
}
