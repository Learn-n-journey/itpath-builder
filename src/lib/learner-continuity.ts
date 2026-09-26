import type { UserData } from "@/lib/app-data/types";
import { nextAction } from "@/lib/next-action";
import { resumeTarget } from "@/lib/resume";

export type ContinuityKind = "study_plan" | "return" | "resume" | "recommendation";

export interface LearnerContinuity {
  kind: ContinuityKind;
  label: string;
  reason: string;
  minutes?: number | undefined;
  to: string;
  params?: Record<string, string> | undefined;
  search?: Record<string, string> | undefined;
  topicId?: string | undefined;
}

/**
 * One authoritative answer to "what should I do next?"
 *
 * Priority is intentionally simple:
 * 1. Continue the active task in a study session the learner deliberately started.
 * 2. Return from targeted remediation to the activity that exposed the gap.
 * 3. Resume unfinished work or the most recently touched topic.
 * 4. Fall back to the evidence-based next-action engine.
 *
 * This function does not create mastery evidence or mutate learner state. It only
 * translates existing state into a single destination that every learner-facing
 * surface can share.
 */
export function learnerContinuity(
  user: UserData,
  now: Date = new Date(),
): LearnerContinuity {
  const openPlan = (user.studyPlans ?? [])
    .filter(
      (plan) =>
        plan.status === "active" &&
        plan.tasks.some((task) => task.status === "active" || task.status === "pending"),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (openPlan) {
    const task =
      openPlan.tasks.find((item) => item.id === openPlan.activeTaskId && item.status !== "completed") ??
      openPlan.tasks.find((item) => item.status === "active") ??
      openPlan.tasks.find((item) => item.status === "pending");

    if (task) {
      return {
        kind: "study_plan",
        label: task.title,
        reason: task.reason || task.detail || "Continue the study session you already started.",
        minutes: task.plannedMinutes,
        to: task.to,
        params: task.params,
        topicId: task.topicId,
      };
    }
  }

  if (user.activityReturn) {
    return {
      kind: "return",
      label: user.activityReturn.label,
      reason: "You reviewed the weak concept. Return to the activity you were doing and try again.",
      to: user.activityReturn.href,
      topicId: user.activityReturn.topicId,
    };
  }

  const resume = resumeTarget(user);
  const recommended = nextAction(user, now);
  const overdueReview = recommended.to === "/review" && user.reviews.some(
    (review) =>
      review.status === "scheduled" &&
      new Date(review.dueAt).getTime() < now.getTime() - 24 * 60 * 60 * 1000,
  );
  if (resume && !overdueReview) {
    return {
      kind: "resume",
      label: resume.label,
      reason: resume.detail,
      to: resume.to,
      params: resume.params,
      search: resume.search,
    };
  }


  return {
    kind: "recommendation",
    label: recommended.label,
    reason: recommended.reason,
    minutes: recommended.minutes,
    to: recommended.to,
    topicId: recommended.topicId,
    params: recommended.topicId ? { topicId: recommended.topicId } : undefined,
  };
}
