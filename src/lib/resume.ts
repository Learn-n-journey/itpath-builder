import { assignments, labs, quizzes, topics } from "@/data/static-content";
import type { UserData } from "@/lib/app-data/types";

/**
 * The single place the learner is most likely to want to go back to: whatever
 * they last touched and have not finished. Derived entirely from recorded
 * activity, so with nothing recorded there is nothing to resume.
 */
export interface ResumeTarget {
  label: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}

function quizRoute(quizId: string, detail: string): ResumeTarget | undefined {
  const section = /^section-quiz-(.+)$/.exec(quizId);
  if (section?.[1]) {
    const topicId = section[1];
    const topic = topics.find((item) => item.id === topicId);
    return {
      label: `Section quiz: ${topic?.title ?? topicId}`,
      detail,
      to: "/section-quiz/$topicId",
      params: { topicId },
    };
  }
  const quiz = quizzes.find((item) => item.id === quizId);
  if (quiz) {
    return { label: `Quiz: ${quiz.title}`, detail, to: "/quiz-me", search: { quiz: quiz.id } };
  }
  return undefined;
}

export function resumeTarget(user: UserData): ResumeTarget | undefined {
  // 1. A quiz opened but not submitted, newest first.
  const openQuiz = user.quizAttempts
    .filter((attempt) => attempt.status === "in_progress")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (openQuiz) {
    const route = quizRoute(openQuiz.quizId, "Finish the questions and submit.");
    if (route) return route;
  }
  // 2. A lab started but not finished.
  const openLab = user.labAttempts.find((attempt) => attempt.status === "in_progress");
  if (openLab) {
    const lab = labs.find((item) => item.id === openLab.labId);
    if (lab) {
      return {
        label: `Lab: ${lab.title}`,
        detail: "Pick up the steps where you left off.",
        to: "/labs",
        search: { lab: lab.id },
      };
    }
  }
  // 3. A practice task written but not yet evaluated.
  const openTask = user.assignmentAttempts.find(
    (attempt) => attempt.status === "started" || attempt.status === "submitted",
  );
  if (openTask) {
    const task = assignments.find((item) => item.id === openTask.assignmentId);
    const topic = task ? topics.find((item) => item.id === task.topicId) : undefined;
    return {
      label: topic ? `${topic.title} · Practice` : "Practice task",
      detail: "Continue your open practice task.",
      to: "/practice",
    };
  }
  // 4. The topic touched most recently.
  const touched = Object.values(user.topicProgress).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0];
  if (touched) {
    const topic = topics.find((item) => item.id === touched.topicId);
    if (topic) {
      return {
        label: topic.title,
        detail: "Continue this section.",
        to: "/topics/$topicId",
        params: { topicId: topic.id },
      };
    }
  }
  // 5. The last quiz completed, as a retake starting point.
  const lastQuiz = user.quizAttempts
    .filter((attempt) => attempt.status === "submitted")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  if (lastQuiz) {
    const route = quizRoute(lastQuiz.quizId, "Run it again, or start a retake.");
    if (route) return route;
  }
  return undefined;
}
