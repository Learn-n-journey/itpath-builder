import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarClock, CheckCircle2, Clock3, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, LearnerPageSkeleton, PageHeader, Panel } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getTopic } from "@/lib/app-data/selectors";
import type { Review as ReviewType } from "@/lib/app-data/types";
import {
  REVIEW_INTERVALS,
  bucketReviews,
  describeSchedule,
  recentlyFailed,
} from "@/lib/review-engine";
import { useAppState } from "@/state/app-state";
import { SectionTabs, REVIEW_TABS } from "@/components/layout/section-tabs";

export const Route = createFileRoute("/review")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Review | IT PATH" },
      { name: "description", content: "Missed questions, weak concepts, and topics due to practise again." },
      { property: "og:title", content: "Review | IT PATH" },
      { property: "og:description", content: "Spaced repetition keeps what you learn from fading." },
    ],
  }),
  component: Review,
});

function topicTitle(topicId: string) {
  return getTopic(topicId)?.title ?? topicId;
}

function Review() {
  const { user, actions, hydrated } = useAppState();
  const buckets = useMemo(() => bucketReviews(user.reviews), [user.reviews]);
  const failed = useMemo(() => recentlyFailed(user), [user]);
  const nextReview = buckets.overdue[0] ?? buckets.dueToday[0];
  const dueNow = buckets.overdue.length + buckets.dueToday.length;

  if (!hydrated) return <LearnerPageSkeleton rows={6} metrics={2} />;

  return (
    <>
      <SectionTabs tabs={REVIEW_TABS} variant="segmented" />
      <PageHeader
        title="Review Schedule"
        description="Keep important concepts from fading with reviews that return when you need them."
      />

      <section className="grid grid-cols-4 divide-x divide-border border-y border-border py-3" aria-label="Review schedule summary">
        <ReviewStat value={buckets.dueToday.length} label="Today" />
        <ReviewStat value={buckets.overdue.length} label="Overdue" />
        <ReviewStat value={buckets.upcoming.length} label="Upcoming" />
        <ReviewStat value={buckets.mastered.length} label="Retained" />
      </section>

      {nextReview ? (
        <section className="relative mt-5 overflow-hidden rounded-2xl border border-primary/45 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-lg">
          <div className="absolute -right-12 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
          <div className="relative">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="size-4" aria-hidden />Review now
            </p>
            <h2 className="mt-3 font-display text-xl font-semibold sm:text-2xl">{topicTitle(nextReview.topicId)}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {buckets.overdue.some((item) => item.id === nextReview.id)
                ? "This review is overdue. A quick check now will update its retention schedule."
                : "This concept is due today. Review it, then grade how well you recalled it."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline"><Clock3 className="mr-1 size-3" />{describeSchedule(nextReview)}</Badge>
              <Badge variant="outline">{nextReview.totalReviews > 0 ? `${nextReview.totalReviews} graded` : "First review"}</Badge>
            </div>
            <Button asChild className="mt-4 w-full sm:w-auto">
              <Link to="/topics/$topicId" params={{ topicId: nextReview.topicId }}>
                Review concept <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      ) : user.reviews.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="Nothing scheduled yet"
          body="Reviews are added automatically as you learn, practice, and expose gaps."
        />
      ) : (
        <section className="mt-5 rounded-xl border border-border/70 bg-card/70 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><CheckCircle2 className="size-4" aria-hidden /></span>
            <div>
              <h2 className="font-display text-base font-semibold">You're caught up</h2>
              <p className="mt-1 text-xs text-muted-foreground">No reviews are due right now. Upcoming work is already scheduled.</p>
            </div>
          </div>
        </section>
      )}

      {user.reviews.length > 0 ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Your schedule</h2>
              <p className="mt-1 text-xs text-muted-foreground">{dueNow > 0 ? `${dueNow} ready to review now` : "Everything is on schedule"}</p>
            </div>
            <CalendarClock className="size-5 text-primary" aria-hidden />
          </div>

          <ReviewQueue
            title="Due today"
            description="Review these now, then grade your recall honestly."
            reviews={buckets.dueToday}
            empty="Nothing is due today."
          />
          <ReviewQueue
            title="Overdue"
            description="These are past their scheduled review date."
            reviews={buckets.overdue}
            empty="Nothing is overdue."
            tone="overdue"
          />
          <ReviewQueue
            title="Upcoming"
            description="Scheduled ahead. They become gradable when they come due."
            reviews={buckets.upcoming}
            empty="Nothing scheduled ahead yet."
            gradable={false}
          />
          <ReviewQueue
            title="Retained"
            description="Concepts that have held through the longest review interval."
            reviews={buckets.mastered}
            empty="Nothing has reached long-term retention yet."
            gradable={false}
          />

          {failed.length > 0 ? (
            <Panel title="Recent misses" description="A missed review returns sooner so you can reinforce it.">
              <ul className="divide-y divide-border text-sm">
                {failed.slice(0, 6).map((attempt) => (
                  <li key={attempt.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="font-medium">{topicTitle(attempt.topicId)}</span>
                    <span className="text-muted-foreground">
                      {attempt.intervalBefore}d → {attempt.intervalAfter}d · {new Date(attempt.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function ReviewStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className="font-display text-lg font-semibold tabular-nums sm:text-xl">{value}</p>
      <p className="mt-1 truncate text-[0.625rem] text-muted-foreground sm:text-xs">{label}</p>
    </div>
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
        <EmptyState title={empty} />
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
                      Got it
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => actions.gradeReview(review.id, "fail")}
                    >
                      Not yet
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
