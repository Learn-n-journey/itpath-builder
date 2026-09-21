import { dailyDateKey, parseDailyQuizId } from "@/data/daily-challenge";
import type { UserData } from "@/lib/app-data/types";
import { currentJourneyTopic } from "@/lib/journey-order";
import { masteryGate } from "@/lib/mastery-gate";
import { bucketReviews } from "@/lib/review-engine";

/**
 * Sidebar attention indicators. Every entry comes from the learner's real
 * records: nothing is shown when there is genuinely nothing waiting, and
 * the numbers are the actual counts of open work.
 */
export interface SidebarAttention {
  /** Sidebar route the indicator belongs to. */
  to: string;
  /** Plain-language line explaining what is waiting (for screen readers). */
  label: string;
  /** How many open items are behind the indicator. Always at least 1. */
  count: number;
}

export function sidebarAttention(user: UserData, now: Date = new Date()): SidebarAttention[] {
  const out: SidebarAttention[] = [];

  // Daily challenge: one short set a day, stored under its own quiz id.
  const todayKey = dailyDateKey(now);
  const challengeDone = (user.quizAttempts ?? []).some(
    (attempt) =>
      attempt.status === "submitted" &&
      parseDailyQuizId(attempt.quizId)?.dateKey === todayKey,
  );
  if (!challengeDone) {
    out.push({
      to: "/daily-challenge",
      label: "Today's daily challenge has not been completed yet",
      count: 1,
    });
  }

  // Review: spaced reviews that are due today or overdue.
  const buckets = bucketReviews(user.reviews ?? [], now);
  const dueCount = buckets.overdue.length + buckets.dueToday.length;
  if (dueCount > 0) {
    out.push({
      to: "/review",
      label: `${dueCount} ${dueCount === 1 ? "review" : "reviews"} due`,
      count: dueCount,
    });
  }

  // Study plan: a session that was built but still has tasks to work through.
  const openPlan = (user.studyPlans ?? []).find(
    (plan) =>
      plan.status !== "completed" &&
      plan.tasks.some((task) => task.status === "pending" || task.status === "active"),
  );
  if (openPlan) {
    const openTasks = openPlan.tasks.filter(
      (task) => task.status === "pending" || task.status === "active",
    ).length;
    out.push({
      to: "/study-plan",
      label: `${openTasks} ${openTasks === 1 ? "task" : "tasks"} waiting in your study plan`,
      count: openTasks,
    });
  }

  // Troubleshoot: incidents started but not yet submitted.
  const openIncidents = (user.incidentAttempts ?? []).filter(
    (attempt) => attempt.status === "in_progress",
  ).length;
  if (openIncidents > 0) {
    out.push({
      to: "/troubleshoot",
      label: `${openIncidents} ${openIncidents === 1 ? "incident" : "incidents"} still open`,
      count: openIncidents,
    });
  }

  // Career mode: support tickets not yet closed.
  const openTickets = (user.careerTickets ?? []).filter(
    (ticket) => ticket.status !== "completed",
  ).length;
  if (openTickets > 0) {
    out.push({
      to: "/career-mode",
      label: `${openTickets} ${openTickets === 1 ? "ticket" : "tickets"} not closed yet`,
      count: openTickets,
    });
  }

  return out;
}
