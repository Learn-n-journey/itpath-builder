export type LearnerStatus = "not_started" | "in_progress" | "due_for_review" | "mastered" | "locked";

export const learnerStatusLabels: Record<LearnerStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  due_for_review: "Due for review",
  mastered: "Mastered",
  locked: "Locked",
};

export function learnerStatusLabel(status?: string | null): string {
  if (!status) return learnerStatusLabels.not_started;
  if (status === "mastered") return learnerStatusLabels.mastered;
  if (status === "locked") return learnerStatusLabels.locked;
  if (status === "needs_review" || status === "scheduled" || status === "overdue") {
    return learnerStatusLabels.due_for_review;
  }
  if (status === "not_started") return learnerStatusLabels.not_started;
  return learnerStatusLabels.in_progress;
}