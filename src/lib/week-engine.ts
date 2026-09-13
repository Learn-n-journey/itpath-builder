import {
  assignments as allAssignments,
  labs as allLabs,
  questions as allQuestions,
  quizzes as allQuizzes,
  resources as allResources,
  topics as allTopics,
  weeks as allWeeks,
} from "@/data/static-content";
import { learningModules } from "@/data/learning-content";
import type {
  Assignment,
  CurriculumWeek,
  Lab,
  Question,
  Quiz,
  Resource,
  Topic,
  UserData,
} from "@/lib/app-data/types";

export const WEEK_QUIZ_PASS = 70;
export const WEEK_ASSESSMENT_PASS = 80;
/** A topic counts as read once its understanding score reaches this, never on opening. */
export const READING_UNDERSTANDING_TARGET = 50;

export interface WeekRequirement {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  evidence: string;
}

export interface WeekLink {
  id: string;
  title: string;
  detail: string;
  to: string;
  params?: Record<string, string>;
  done?: boolean;
}

export interface WeekPerformance {
  label: string;
  value: number | null;
}

export interface WeekBundle {
  week: CurriculumWeek;
  topics: Topic[];
  objectives: Array<{ topic: Topic; objectives: string[] }>;
  reading: WeekLink[];
  videos: Resource[];
  references: Resource[];
  practice: WeekLink[];
  labs: Lab[];
  assignments: Assignment[];
  quiz: Quiz | undefined;
  assessment: Quiz | undefined;
  questionCount: number;
  requirements: WeekRequirement[];
  completedRequirements: number;
  complete: boolean;
  performance: WeekPerformance[];
  overall: number | null;
  reviewDue: number;
  reviewScheduled: number;
}

function byId<T extends { id: string }>(items: T[], ids: string[]): T[] {
  return ids.map((id) => items.find((item) => item.id === id)).filter((item): item is T => Boolean(item));
}

function pct(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function bestScore(user: UserData, quizId: string | undefined): number | null {
  if (!quizId) return null;
  const submitted = user.quizAttempts.filter(
    (attempt) => attempt.quizId === quizId && attempt.status === "submitted",
  );
  if (submitted.length === 0) return null;
  return submitted.reduce((value, attempt) => Math.max(value, attempt.score), 0);
}

export function getWeeks(): CurriculumWeek[] {
  return allWeeks;
}

export function buildWeekBundle(user: UserData, week: CurriculumWeek): WeekBundle {
  const topics = byId(allTopics, week.topicIds);
  const now = Date.now();

  const reading: WeekLink[] = topics.map((topic) => {
    const understanding = user.topicProgress[topic.id]?.understanding ?? 0;
    const module = learningModules.find((item) => item.topicId === topic.id);
    return {
      id: `reading-${topic.id}`,
      title: topic.title,
      detail: module
        ? `Full lesson with ${module.examCoverage.length} exam points · understanding ${understanding}%`
        : `Understanding ${understanding}%`,
      to: "/topics/$topicId",
      params: { topicId: topic.id },
      done: understanding >= READING_UNDERSTANDING_TARGET,
    };
  });

  const practice: WeekLink[] = topics.map((topic) => {
    const correct = user.practiceResponses.some((item) => item.topicId === topic.id && item.correct);
    const recalled = user.recallResponses.some((item) => item.topicId === topic.id && item.correct);
    return {
      id: `practice-${topic.id}`,
      title: `${topic.title} recall and practice`,
      detail: `${recalled ? "Recall answered correctly" : "Recall outstanding"} · ${
        correct ? "Practice answered correctly" : "Practice outstanding"
      }`,
      to: "/topics/$topicId",
      params: { topicId: topic.id },
      done: correct && recalled,
    };
  });

  const labs = allLabs.filter((lab) => week.topicIds.includes(lab.topicId));
  const assignments = allAssignments.filter((item) => week.topicIds.includes(item.topicId));
  const quiz = allQuizzes.find((item) => item.id === week.quizId);
  const assessment = allQuizzes.find((item) => item.id === week.assessmentQuizId);
  const weekQuestions: Question[] = quiz
    ? byId(allQuestions, quiz.questionIds)
    : allQuestions.filter((item) => week.topicIds.includes(item.topicId));

  const labDone = labs.filter((lab) =>
    user.labAttempts.some(
      (attempt) =>
        attempt.labId === lab.id && (attempt.status === "completed" || attempt.status === "mastered"),
    ),
  );
  const assignmentDone = assignments.filter((assignment) =>
    user.assignmentAttempts.some(
      (attempt) => attempt.assignmentId === assignment.id && attempt.status === "completed",
    ),
  );

  const weekReviews = user.reviews.filter((review) => week.topicIds.includes(review.topicId));
  const overdue = weekReviews.filter(
    (review) => review.status !== "mastered" && new Date(review.dueAt).getTime() <= now,
  );

  const quizBest = bestScore(user, week.quizId);
  const assessmentBest = bestScore(user, week.assessmentQuizId);

  const readingDone = reading.filter((item) => item.done).length;
  const practiceDone = practice.filter((item) => item.done).length;

  const requirements: WeekRequirement[] = [
    {
      id: "reading",
      label: "Reading",
      detail: `Study every topic lesson for this week (understanding ${READING_UNDERSTANDING_TARGET}% or higher).`,
      done: readingDone === reading.length && reading.length > 0,
      evidence: `${readingDone}/${reading.length} topics`,
    },
    {
      id: "practice",
      label: "Recall and practice",
      detail: "Answer the recall question and the practice activity correctly for every topic.",
      done: practiceDone === practice.length && practice.length > 0,
      evidence: `${practiceDone}/${practice.length} topics`,
    },
  ];

  if (labs.length > 0) {
    requirements.push({
      id: "lab",
      label: "Lab",
      detail: "Finish the practical lab for this week.",
      done: labDone.length === labs.length,
      evidence: `${labDone.length}/${labs.length} labs completed`,
    });
  }
  if (assignments.length > 0) {
    requirements.push({
      id: "assignment",
      label: "Assignment",
      detail: "Complete the assignments attached to this week's topics.",
      done: assignmentDone.length === assignments.length,
      evidence: `${assignmentDone.length}/${assignments.length} assignments completed`,
    });
  }
  requirements.push(
    {
      id: "quiz",
      label: "Weekly quiz",
      detail: `Score ${WEEK_QUIZ_PASS}% or higher on the ${weekQuestions.length}-question week quiz.`,
      done: (quizBest ?? 0) >= WEEK_QUIZ_PASS,
      evidence: quizBest === null ? "No attempt yet" : `Best ${quizBest}%`,
    },
    {
      id: "review",
      label: "Spaced review",
      detail: "Clear every review scheduled for this week's topics.",
      done: overdue.length === 0,
      evidence:
        weekReviews.length === 0
          ? "Nothing scheduled"
          : `${overdue.length} due now of ${weekReviews.length} scheduled`,
    },
    {
      id: "assessment",
      label: "Weekly assessment",
      detail: `Score ${WEEK_ASSESSMENT_PASS}% or higher on the graded weekly assessment.`,
      done: (assessmentBest ?? 0) >= WEEK_ASSESSMENT_PASS,
      evidence: assessmentBest === null ? "No attempt yet" : `Best ${assessmentBest}%`,
    },
  );

  const labScores = labs
    .map((lab) =>
      user.labAttempts
        .filter((attempt) => attempt.labId === lab.id && attempt.maxScore > 0)
        .reduce<number | null>(
          (value, attempt) => Math.max(value ?? 0, Math.round((attempt.score / attempt.maxScore) * 100)),
          null,
        ),
    )
    .map((value) => value ?? 0);
  const assignmentScores = assignments
    .map((assignment) =>
      user.assignmentAttempts
        .filter(
          (attempt) =>
            attempt.assignmentId === assignment.id && (attempt.maxScore ?? 0) > 0 && attempt.score !== undefined,
        )
        .reduce<number | null>(
          (value, attempt) =>
            Math.max(value ?? 0, Math.round(((attempt.score ?? 0) / (attempt.maxScore ?? 1)) * 100)),
          null,
        ),
    )
    .map((value) => value ?? 0);

  const average = (values: number[]) =>
    values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

  const performance: WeekPerformance[] = [
    {
      label: "Reading",
      value: average(topics.map((topic) => user.topicProgress[topic.id]?.understanding ?? 0)),
    },
    { label: "Recall and practice", value: pct(practiceDone, practice.length) },
    { label: "Labs", value: average(labScores) },
    { label: "Assignments", value: average(assignmentScores) },
    { label: "Weekly quiz", value: quizBest },
    { label: "Assessment", value: assessmentBest },
  ];
  const measured = performance.map((item) => item.value ?? 0);

  const completedRequirements = requirements.filter((item) => item.done).length;

  return {
    week,
    topics,
    objectives: topics.map((topic) => ({ topic, objectives: topic.learningObjectives })),
    reading,
    videos: byId(allResources, week.videoResourceIds),
    references: byId(allResources, week.referenceResourceIds),
    practice,
    labs,
    assignments,
    quiz,
    assessment,
    questionCount: weekQuestions.length,
    requirements,
    completedRequirements,
    complete: completedRequirements === requirements.length,
    performance,
    overall: average(measured),
    reviewDue: overdue.length,
    reviewScheduled: weekReviews.length,
  };
}
