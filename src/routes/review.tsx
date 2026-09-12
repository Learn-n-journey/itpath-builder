import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { MissedQuestionsPanel } from "@/components/review/missed-questions-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSkill, skillNodes } from "@/data/prerequisite-graph";
import { getTopic } from "@/lib/app-data/selectors";
import type { MistakeCause, Review as ReviewType } from "@/lib/app-data/types";
import {
  mistakeActivityLabels,
  mistakeCauseLabels,
  summarizeMistakes,
} from "@/lib/mistake-engine";
import {
  REVIEW_INTERVALS,
  bucketReviews,
  describeSchedule,
  recentlyFailed,
} from "@/lib/review-engine";
import { missedQuestionCount, missedQuestions, type MissedQuestion } from "@/lib/missed-questions";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Review — IT PATH" },
      { name: "description", content: "Spaced review of past topics and unresolved mistakes." },
      { property: "og:title", content: "Review — IT PATH" },
      { property: "og:description", content: "Spaced repetition keeps what you learn from fading." },
    ],
  }),
  component: Review,
});

function topicTitle(topicId: string) {
  return getTopic(topicId)?.title ?? topicId;
}

function Review() {
  const { user, actions } = useAppState();
  const [categoryFilter, setCategoryFilter] = useState<MistakeCause | "all">("all");
  const [showResolved, setShowResolved] = useState(false);

  const summary = useMemo(() => summarizeMistakes(user), [user]);
  const buckets = useMemo(() => bucketReviews(user.reviews), [user.reviews]);
  const failed = useMemo(() => recentlyFailed(user), [user]);
  const missed = useMemo(() => missedQuestions(user), [user]);
  const missedCount = useMemo(() => missedQuestionCount(user), [user]);
  const weakConcepts = useMemo(() => {
    const byTopic = new Map<string, { topicId: string; quiz: number; practice: number; recall: number }>();
    const topicIdOf = (item: MissedQuestion) =>
      item.kind === "quiz"
        ? item.question.topicId
        : item.kind === "practice"
          ? item.assignment.topicId
          : item.recall.topicId;
    for (const item of missed) {
      const topicId = topicIdOf(item);
      const entry = byTopic.get(topicId) ?? { topicId, quiz: 0, practice: 0, recall: 0 };
      entry[item.kind] += 1;
      byTopic.set(topicId, entry);
    }
    return [...byTopic.values()].sort(
      (a, b) => b.quiz + b.practice + b.recall - (a.quiz + a.practice + a.recall),
    );
  }, [missed]);

  const mistakes = user.mistakes.filter(
    (mistake) =>
      (showResolved || !mistake.resolved) &&
      (categoryFilter === "all" || mistake.category === categoryFilter),
  );

  return (
    <>
      <PageHeader
        title="Review"
        description="Every mistake is logged with its cause and the prerequisite it points back to, so review starts at the root cause instead of the newest topic."
      />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="To work on" value={missedCount} />
        <StatCard label="Mastered" value={buckets.mastered.length} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Weak concepts">
          {weakConcepts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No weak concepts yet. They appear here when you miss quiz or practice questions.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {weakConcepts.map((entry) => (
                <li key={entry.topicId} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{topicTitle(entry.topicId)}</span>
                    <span className="flex flex-wrap gap-1">
                      {entry.quiz > 0 ? (
                        <Badge variant="outline">
                          {entry.quiz} missed quiz {entry.quiz === 1 ? "question" : "questions"}
                        </Badge>
                      ) : null}
                      {entry.practice > 0 ? (
                        <Badge variant="outline">
                          {entry.practice} failed practice {entry.practice === 1 ? "task" : "tasks"}
                        </Badge>
                      ) : null}
                      {entry.recall > 0 ? (
                        <Badge variant="outline">
                          {entry.recall} missed recall {entry.recall === 1 ? "question" : "questions"}
                        </Badge>
                      ) : null}
                    </span>
                  </div>
                  <Button asChild size="sm" variant="secondary" className="mt-2">
                    <Link to="/topics/$topicId" params={{ topicId: entry.topicId }}>
                      Open {topicTitle(entry.topicId)}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Mistake categories">
          {summary.byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open mistakes recorded yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {summary.byCategory.map((entry) => (
                <li key={entry.category} className="flex justify-between py-2">
                  <span>{mistakeCauseLabels[entry.category]}</span>
                  <span className="text-muted-foreground">{entry.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4">
        <MissedQuestionsPanel />

        <Panel title="Mistake log">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={categoryFilter === "all" ? "default" : "outline"}
              onClick={() => setCategoryFilter("all")}
            >
              All causes
            </Button>
            {(Object.keys(mistakeCauseLabels) as MistakeCause[]).map((cause) => (
              <Button
                key={cause}
                size="sm"
                variant={categoryFilter === cause ? "default" : "outline"}
                onClick={() => setCategoryFilter(cause)}
              >
                {mistakeCauseLabels[cause]}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setShowResolved((v) => !v)}>
              {showResolved ? "Hide resolved" : "Show resolved"}
            </Button>
          </div>

          {mistakes.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No mistakes match this filter.
            </p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm">
              {mistakes.map((mistake) => (
                <li key={mistake.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{topicTitle(mistake.topicId)}</span>
                    <Badge variant="outline">{mistakeActivityLabels[mistake.activity]}</Badge>
                    <Badge variant="outline">{mistakeCauseLabels[mistake.category]}</Badge>
                    <Badge variant={mistake.severity === "high" ? "destructive" : "secondary"}>
                      {mistake.severity} severity
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(mistake.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {mistake.attemptId ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Attempt {mistake.attemptId.slice(0, 8)}
                    </p>
                  ) : null}
                  {mistake.recommendedSkillIds.length > 0 ? (
                    <p className="mt-2 text-muted-foreground">
                      Recommended review:{" "}
                      {mistake.recommendedSkillIds
                        .map((id) => getSkill(id)?.title ?? id)
                        .join(", ")}
                    </p>
                  ) : null}
                  <Button
                    size="sm"
                    variant={mistake.resolved ? "outline" : "secondary"}
                    className="mt-2"
                    onClick={() => actions.setMistakeResolved(mistake.id, !mistake.resolved)}
                  >
                    {mistake.resolved ? "Reopen" : "Mark resolved"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {user.reviews.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title="Nothing scheduled for review"
            body="Reviews are scheduled automatically when a quiz, recall check, or assignment exposes a gap."
          />
        ) : (
          <>
            <ReviewQueue
              title="Due today"
              description="Grade each item honestly. Opening a topic does not count as a successful review."
              reviews={buckets.dueToday}
              empty="Nothing is due today."
            />
            <ReviewQueue
              title="Overdue"
              description="Past their due date. The longer they wait, the more retention decays."
              reviews={buckets.overdue}
              empty="Nothing is overdue."
              tone="overdue"
            />
            <ReviewQueue
              title="Upcoming"
              description="Scheduled ahead. These cannot be graded until they come due."
              reviews={buckets.upcoming}
              empty="Nothing scheduled ahead yet."
              gradable={false}
            />
            <ReviewQueue
              title="Mastered"
              description="Passed at the 90-day interval. Retention is holding."
              reviews={buckets.mastered}
              empty="No topic has reached the 90-day interval yet."
              gradable={false}
            />
          </>
        )}

        <Panel
          title="Recently failed"
          description="Every graded review is stored. Failures shorten the interval so the topic comes back sooner."
        >
          {failed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failed reviews recorded.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {failed.map((attempt) => (
                <li key={attempt.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="font-medium">{topicTitle(attempt.topicId)}</span>
                  <span className="text-muted-foreground">
                    {attempt.intervalBefore}d → {attempt.intervalAfter}d ·{" "}
                    {new Date(attempt.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Prerequisite map">
          <p className="text-sm text-muted-foreground">
            Recommendations always move backwards along these dependencies, never forwards into more
            advanced material.
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {skillNodes.map((skill) => (
              <li key={skill.id} className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="font-medium">{skill.title}</span>
                <span className="text-muted-foreground">
                  {skill.prerequisiteSkillIds.length === 0
                    ? "no prerequisites"
                    : `needs ${skill.prerequisiteSkillIds
                        .map((id) => getSkill(id)?.title ?? id)
                        .join(", ")}`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function ReviewQueue({
  title,
  description,
  reviews,
  empty,
  gradable = true,
  tone,
}: {
  title: string;
  description: string;
  reviews: ReviewType[];
  empty: string;
  gradable?: boolean;
  tone?: "overdue";
}) {
  const { actions } = useAppState();
  return (
    <Panel title={title} description={description}>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{topicTitle(review.topicId)}</span>
                <Badge variant={tone === "overdue" ? "destructive" : "outline"}>
                  due {new Date(review.dueAt).toLocaleDateString()}
                </Badge>
                <Badge variant="secondary">{describeSchedule(review)}</Badge>
                {review.totalReviews > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {review.totalReviews} graded · {review.successStreak} in a row ·{" "}
                    {review.lapses} lapses
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Never graded</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/topics/$topicId" params={{ topicId: review.topicId }}>
                    Open topic
                  </Link>
                </Button>
                {gradable ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => actions.gradeReview(review.id, "pass")}
                    >
                      Passed
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => actions.gradeReview(review.id, "fail")}
                    >
                      Failed
                    </Button>
                  </>
                ) : null}
                <RescheduleControl reviewId={review.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RescheduleControl({ reviewId }: { reviewId: string }) {
  const { actions } = useAppState();
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Reschedule
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      {REVIEW_INTERVALS.map((days) => (
        <Button
          key={days}
          size="sm"
          variant="secondary"
          onClick={() => {
            actions.rescheduleReview(reviewId, days);
            setOpen(false);
          }}
        >
          {days}d
        </Button>
      ))}
    </span>
  );
}
