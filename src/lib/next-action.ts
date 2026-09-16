/**
 * Next action engine.
 *
 * Picks the single highest-value thing to do next, from recorded evidence only.
 * Rules are ordered by how much they cost the learner if ignored: overdue
 * retention first, then unresolved mistakes, then unfinished work already open,
 * then the gap between what has been read and what has been proven, then new
 * material. Every action points at a route that exists.
 */
import { assignments, labs, topics } from "@/data/static-content";
import { adaptivePath } from "@/lib/adaptive-path";
import { certificationTopics } from "@/lib/cert-path";
import { buildIntelligence } from "@/lib/intelligence/engine";
import { METHOD_LABEL } from "@/lib/intelligence/types";
import { missedQuestions } from "@/lib/missed-questions";
import { buildReadinessReport } from "@/lib/readiness-engine";
import type { EntityId, UserData } from "@/lib/app-data/types";
import { topicScopeProgress } from "@/lib/scope-progress";

export type NextActionRoute =
  | "/review"
  | "/weak-areas"
  | "/labs"
  | "/practice"
  | "/quiz-me"
  | "/troubleshoot"
  | "/career-mode"
  | "/learn"
  | "/certifications"
  | "/study-plan"
  | "/settings"
  | "/ai-tutor"
  | "/command-line"
  | "/topics/$topicId";

export interface NextAction {
  id: string;
  /** What to do, as an instruction. */
  label: string;
  /** Why this and not something else, always traceable to recorded data. */
  reason: string;
  /** Roughly how long it takes, in minutes. */
  minutes: number;
  to: NextActionRoute;
  topicId?: EntityId;
}

const MS_DAY = 24 * 60 * 60 * 1000;

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Topics the learner has actually opened up.
 *
 * Finishing a practice task on a topic is the marker: until that happens the
 * topic counts as untouched and nothing here will point at it, so the list
 * never asks for work on material that has not been started.
 */
function startedTopicIds(user: UserData): Set<EntityId> {
  const started = new Set<EntityId>();
  for (const attempt of user.assignmentAttempts) {
    if (!attempt.topicId) continue;
    if (attempt.status === "completed" || attempt.status === "evaluated") {
      started.add(attempt.topicId);
    }
  }
  return started;
}

/**
 * The full ranked list. The first entry is the recommendation; the rest are
 * shown as alternatives so the learner is never boxed in.
 */
export function nextActions(user: UserData, now: Date = new Date()): NextAction[] {
  const out: NextAction[] = [];
  const nowMs = now.getTime();
  const path = adaptivePath(user);
  const certTopicIds = new Set(certificationTopics(path.certification.id).map((t) => t.id));
  const started = startedTopicIds(user);

  // 1. Reviews that are already due. Retention decays first.
  const due = user.reviews.filter(
    (review) => review.status === "scheduled" && new Date(review.dueAt).getTime() <= nowMs,
  );
  if (due.length > 0) {
    const oldest = Math.max(
      ...due.map((review) => Math.floor((nowMs - new Date(review.dueAt).getTime()) / MS_DAY)),
    );
    out.push({
      id: "next-review",
      label: `Clear ${due.length} due review${due.length === 1 ? "" : "s"}`,
      reason:
        oldest >= 1
          ? `Your oldest review has been waiting ${oldest} day${oldest === 1 ? "" : "s"}. Spacing only works on time.`
          : "These are due today, which is when the spacing interval pays off.",
      minutes: Math.min(45, 5 + due.length * 4),
      to: "/review",
    });
  }

  // 2. Questions you have already got wrong and never answered correctly.
  const missed = missedQuestions(user);
  if (missed.length >= 3) {
    out.push({
      id: "next-weak-areas",
      label: `Re-answer ${missed.length} missed question${missed.length === 1 ? "" : "s"}`,
      reason:
        "A mistake stays open until you answer that exact question correctly, so these are known gaps.",
      minutes: Math.min(40, 4 + missed.length * 2),
      to: "/weak-areas",
    });
  }

  // 3. The learning intelligence engine's top concept: the diagnosed cause of
  // the current struggle, taught the way that cause needs to be taught.
  const intelligence = buildIntelligence(user, now);
  const startedConcepts = intelligence.queue
    .filter((concept) => started.has(concept.topicId))
    .sort((a, b) => journeyIndex(a.topicId) - journeyIndex(b.topicId));
  for (const concept of startedConcepts.slice(0, 2)) {
    if (concept.attempts === 0 && concept.diagnosis === "never_learned") continue;
    out.push({
      id: `next-intel-${concept.topicId}`,
      label: `${concept.instruction}, ${METHOD_LABEL[concept.method].toLowerCase()}`,
      reason: concept.evidence,
      minutes: concept.estimatedMinutes,
      topicId: concept.topicId,
      to: concept.route as NextActionRoute,
    });
  }

  // 4. Work already started and left hanging.
  const openLab = user.labAttempts.find((attempt) => attempt.status === "in_progress");
  if (openLab) {
    out.push({
      id: "next-open-lab",
      label: `Finish the lab: ${labs.find((lab) => lab.id === openLab.labId)?.title ?? "in progress"}`,
      reason: "You started this lab and have not recorded a reflection, so it scores nothing yet.",
      minutes: 30,
      to: "/labs",
    });
  }
  const openTask = user.assignmentAttempts.find(
    (attempt) => attempt.status === "started" || attempt.status === "submitted",
  );
  if (openTask) {
    out.push({
      id: "next-open-practice",
      label: `Finish the practice task: ${assignments.find((a) => a.id === openTask.assignmentId)?.title ?? "in progress"}`,
      reason: "It is written but not evaluated, so it is not counted anywhere.",
      minutes: 20,
      to: "/practice",
    });
  }

  // 4. Studied but never tested: the most common false sense of progress.
  const quizzedTopics = new Set(
    user.quizAttempts
      .filter((attempt) => attempt.status === "submitted")
      .flatMap((attempt) => attempt.results.map((result) => result.topicId)),
  );
  const untested = topics.find((topic) => {
    const progress = topicScopeProgress(user, topic.id);
    return (
      certTopicIds.has(topic.id) &&
      mean([progress.understanding.score, progress.recall.score]) >= 50 &&
      !quizzedTopics.has(topic.id)
    );
  });
  if (untested) {
    out.push({
      id: "next-quiz-untested",
      label: `Quiz yourself on ${untested.title}`,
      reason: "You have read it and recalled it, but never answered exam questions on it.",
      minutes: 15,
      to: "/quiz-me",
    });
  }

  // 5. Known in theory, unproven in practice.
  const unproven = topics.find((topic) => {
    const progress = topicScopeProgress(user, topic.id);
    if (!certTopicIds.has(topic.id)) return false;
    return mean([progress.understanding.score, progress.recall.score]) >= 60 && progress.practicalAbility.score < 40;
  });
  if (unproven) {
    out.push({
      id: "next-lab-unproven",
      label: `Run a lab on ${unproven.title}`,
      reason: "Your knowledge score on it is well ahead of your hands-on score.",
      minutes: 30,
      topicId: unproven.id,
      to: "/labs",
    });
  }

  // 6. Troubleshooting is the weakest measured dimension on the target cert.
  const report = buildReadinessReport(user, path.certification, now);
  if (report.readiness.hasEvidence && report.readiness.troubleshooting < 40) {
    out.push({
      id: "next-troubleshoot",
      label: "Work a fault from start to finish",
      reason: `Troubleshooting is your lowest measured skill on ${path.certification.title}.`,
      minutes: 25,
      to: "/troubleshoot",
    });
  }

  // 7. New material.
  if (path.recommendedTopic) {
    out.push({
      id: "next-topic",
      label: `Study ${path.recommendedTopic.title}`,
      reason: `${path.startLabel}, ${path.reason}.`,
      minutes: 40,
      topicId: path.recommendedTopic.id,
      to: "/topics/$topicId",
    });
  }

  // 8. Everything measured is above the bar.
  if (report.band === "exam_ready") {
    out.unshift({
      id: "next-exam",
      label: `Book your ${path.certification.title} exam`,
      reason: "Your recorded evidence is above the exam-ready bar on every measure.",
      minutes: 10,
      to: "/certifications",
    });
  }

  if (out.length === 0) {
    out.push({
      id: "next-settings",
      label: "Set your certification goal",
      reason: "Nothing is recorded yet, so the path is chosen from your goal and experience level.",
      minutes: 5,
      to: "/settings",
    });
  }

  return out;
}

export function nextAction(user: UserData, now: Date = new Date()): NextAction {
  return nextActions(user, now)[0] as NextAction;
}
