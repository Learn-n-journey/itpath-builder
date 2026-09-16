import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Flame, PartyPopper, Share2, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import type { Quiz } from "@/lib/app-data/types";
import { cn } from "@/lib/utils";

import {
  DAILY_TIERS,
  dailyChallenge,
  dailyDateKey,
  dailyKeyLabel,
  parseDailyQuizId,
  recentDailyKeys,
  tierInfo,
  type ChallengeTier,
} from "@/data/daily-challenge";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/daily-challenge")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Daily Challenge | IT PATH" },
      {
        name: "description",
        content:
          "One short mixed quiz every day. The same set for everyone, compared to your own past attempts.",
      },
      { property: "og:title", content: "Daily Challenge | IT PATH" },
      {
        property: "og:description",
        content: "Five mixed questions a day, scored against your own record.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DailyChallengePage,
});

function DailyChallengePage() {
  const { user } = useAppState();
  // Today's key is worked out straight away so the set is never stuck loading.
  // The effect then corrects it to the browser's local day if that differs.
  const [todayKey, setTodayKey] = useState<string>(() => dailyDateKey());
  const [tier, setTier] = useState<ChallengeTier>("beginner");
  const [shared, setShared] = useState(false);
  useEffect(() => {
    const local = dailyDateKey();
    setTodayKey((current) => (current === local ? current : local));
  }, []);

  const challenge = useMemo(
    () => (todayKey ? dailyChallenge(todayKey, tier) : null),
    [todayKey, tier],
  );

  const historyKeys = useMemo(
    () => (todayKey ? recentDailyKeys(7, new Date(`${todayKey}T12:00:00`)) : []),
    [todayKey],
  );
  const monthKeys = useMemo(
    () => (todayKey ? recentDailyKeys(30, new Date(`${todayKey}T12:00:00`)) : []),
    [todayKey],
  );

  /** Best score and attempt count per day, split by tier and across all tiers. */
  const history = useMemo(() => {
    const byTier = new Map<string, { best: number; attempts: number }>();
    const byDay = new Map<string, { best: number; attempts: number }>();
    for (const attempt of user.quizAttempts) {
      if (attempt.status !== "submitted") continue;
      const parsed = parseDailyQuizId(attempt.quizId);
      if (!parsed) continue;
      const tierEntry = byTier.get(`${parsed.dateKey}:${parsed.tier}`) ?? { best: 0, attempts: 0 };
      tierEntry.attempts += 1;
      tierEntry.best = Math.max(tierEntry.best, attempt.score);
      byTier.set(`${parsed.dateKey}:${parsed.tier}`, tierEntry);

      const dayEntry = byDay.get(parsed.dateKey) ?? { best: 0, attempts: 0 };
      dayEntry.attempts += 1;
      dayEntry.best = Math.max(dayEntry.best, attempt.score);
      byDay.set(parsed.dateKey, dayEntry);
    }
    return { byTier, byDay };
  }, [user.quizAttempts]);

  const submittedByDay = history.byDay;
  const today = challenge ? history.byTier.get(`${challenge.dateKey}:${tier}`) : undefined;
  const tierBest = useMemo(() => {
    let best = 0;
    for (const [key, entry] of history.byTier) {
      if (key.endsWith(`:${tier}`)) best = Math.max(best, entry.best);
    }
    return best;
  }, [history.byTier, tier]);

  /** Thirty day trend: the average of the first half against the second half. */
  const monthStats = useMemo(() => {
    const scored = monthKeys
      .map((key) => ({ key, entry: submittedByDay.get(key) }))
      .filter((item): item is { key: string; entry: { best: number; attempts: number } } =>
        Boolean(item.entry),
      );
    if (scored.length === 0) return { days: 0, average: 0, change: 0 };
    const average =
      Math.round(scored.reduce((sum, item) => sum + item.entry.best, 0) / scored.length);
    const half = Math.floor(scored.length / 2);
    const mean = (list: typeof scored) =>
      list.length === 0 ? 0 : list.reduce((sum, item) => sum + item.entry.best, 0) / list.length;
    const change = half === 0 ? 0 : Math.round(mean(scored.slice(half)) - mean(scored.slice(0, half)));
    return { days: scored.length, average, change };
  }, [monthKeys, submittedByDay]);

  // Consecutive days ending today (or yesterday, if today is not done yet)
  // with a submitted daily challenge on any tier.
  const challengeStreak = useMemo(() => {
    let streak = 0;
    if (!todayKey) return 0;
    const start = submittedByDay.has(todayKey) ? 0 : -1;
    for (let offset = start; offset > -400; offset -= 1) {
      const date = new Date(`${todayKey}T12:00:00`);
      date.setDate(date.getDate() + offset);
      const key = dailyDateKey(date);
      if (submittedByDay.has(key)) streak += 1;
      else break;
    }
    return streak;
  }, [submittedByDay, todayKey]);

  const quiz = useMemo(() => {
    if (!challenge) return null;
    return {
      id: challenge.id,
      title: `Daily Challenge · ${tierInfo(challenge.tier).label} · ${dailyKeyLabel(challenge.dateKey)}`,
      description: `${tierInfo(challenge.tier).description} Same set for everyone today; your answers feed the same review and mistake engine as every other quiz.`,
      topicIds: [...new Set(challenge.questions.map((question) => question.topicId))],
      questionIds: challenge.questions.map((question) => question.id),
    } satisfies Quiz;
  }, [challenge]);

  return (
    <>
      <PageHeader
        title="Daily Challenge"
        description="One short set a day. Pick your tier, and move up when the easier one stops stretching you."
      />

      <Panel
        title="Choose your tier"
        description="Each tier is a different set, drawn from harder material as you climb. All three count towards the same streak."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {DAILY_TIERS.map((item) => {
            const best = [...history.byTier.entries()]
              .filter(([key]) => key.endsWith(`:${item.id}`))
              .reduce((top, [, entry]) => Math.max(top, entry.best), 0);
            const active = item.id === tier;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTier(item.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  active
                    ? "border-primary/60 bg-primary/10 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                    : "border-border/70 bg-secondary/30 hover:border-primary/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold">{item.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {item.count} questions
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                <p className="mt-2 text-xs font-medium text-primary">
                  {best > 0 ? `Your best: ${best}%` : "No score yet"}
                </p>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={`Today, ${tierInfo(tier).label.toLowerCase()}`} value={today ? `${today.best}%` : "Not started"} />
        <StatCard label="Attempts today" value={today?.attempts ?? 0} />
        <StatCard label="Challenge streak" value={challengeStreak} />
        <StatCard
          label={`Best, ${tierInfo(tier).label.toLowerCase()}`}
          value={tierBest > 0 ? `${tierBest}%` : "-"}
          {...(tierBest >= 100 && tier !== "expert"
            ? { hint: "Full marks here. Try the next tier up." }
            : {})}
        />
      </div>

      {today ? (
        <Panel
          className="mt-5 border-primary/50"
          title={`Today's ${tierInfo(tier).label.toLowerCase()} set is done`}
          description={`Your best today is ${today.best}%. Every answer counted towards your reviews.`}
        >
          <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/40 bg-primary/5 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary">
              <PartyPopper className="size-7" aria-hidden />
            </span>
            <div>
              <h2 className="font-display text-2xl font-semibold">
                {today.best === 100
                  ? "Full marks"
                  : today.best >= 80
                    ? "Strong day"
                    : "Day logged"}
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {today.best === 100
                  ? `A clean sweep of the ${tierInfo(tier).label.toLowerCase()} set.`
                  : today.best >= 80
                    ? `You held on to most of it today at ${today.best}%.`
                    : `${today.best}% today, and the misses are already queued for review.`}{" "}
                {challengeStreak > 1
                  ? `That is ${challengeStreak} days in a row.`
                  : "Come back tomorrow to start a streak."}
                {tierBest > 0 && today.best >= tierBest ? " That also matches your personal best." : ""}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => void shareResult()}>
                <Share2 aria-hidden /> {shared ? "Share again" : "Share this"}
              </Button>
              {tier !== "expert" && today.best >= 80 ? (
                <Button
                  variant="secondary"
                  onClick={() => setTier(tier === "beginner" ? "intermediate" : "expert")}
                >
                  Try the next tier
                </Button>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}

      {quiz && challenge ? (
        <div className="mt-6 space-y-4">
          <QuizRunner
            key={quiz.id}
            quiz={quiz}
            questions={challenge.questions}
            startLabel={`Start today's ${tierInfo(tier).label.toLowerCase()} set`}
          />
        </div>
      ) : (
        <Panel title="Loading today's set" description="One moment." />
      )}


      <Panel
        title="Your last seven days"
        description="Each box is one daily challenge. A filled box means you submitted it; the number is your best score that day."
      >
        <div className="grid grid-cols-7 gap-2">
          {historyKeys.map((key) => {
            const entry = submittedByDay.get(key);
            const isToday = key === todayKey;
            return (
              <div key={key} className="text-center">
                <div
                  className={cn(
                    "flex h-12 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-all",
                    entry
                      ? entry.best >= 80
                        ? "border-primary/50 bg-primary/20 text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                        : "border-border bg-secondary text-foreground"
                      : "border-dashed border-border/70 text-muted-foreground",
                    isToday && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
                  )}
                  title={`${dailyKeyLabel(key)}: ${entry ? `${entry.best}% on attempt(s) ×${entry.attempts}` : "not done"}`}
                >
                  {entry ? entry.best : "-"}
                </div>
                <p
                  className={cn(
                    "mt-1.5 truncate text-[10px] uppercase tracking-wide",
                    isToday ? "font-semibold text-primary" : "text-muted-foreground",
                  )}
                >
                  {isToday ? "Today" : dailyKeyLabel(key).split(" ").slice(-2).join(" ")}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Your last thirty days"
        description="One bar per day, tallest is your best score that day. Over a month you can see whether the line is drifting upwards."
      >
        {monthStats.days === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing to plot yet. Submit a few daily sets and the month view fills in.
          </p>
        ) : (
          <>
            <div className="flex h-28 items-end gap-[3px]">
              {monthKeys.map((key) => {
                const entry = submittedByDay.get(key);
                const height = entry ? Math.max(6, entry.best) : 0;
                const isToday = key === todayKey;
                return (
                  <div
                    key={key}
                    className="flex h-full flex-1 items-end"
                    title={`${dailyKeyLabel(key)}: ${entry ? `${entry.best}%` : "not done"}`}
                  >
                    <div
                      className={cn(
                        "w-full rounded-sm transition-all",
                        entry
                          ? entry.best >= 80
                            ? "bg-primary"
                            : "bg-primary/45"
                          : "bg-border/60",
                        isToday && "ring-1 ring-primary/60",
                      )}
                      style={{ height: entry ? `${height}%` : "4px" }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Days done</p>
                <p className="mt-1 font-semibold tabular-nums">{monthStats.days} of 30</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Average score</p>
                <p className="mt-1 font-semibold tabular-nums">{monthStats.average}%</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Trend</p>
                <p
                  className={cn(
                    "mt-1 font-semibold tabular-nums",
                    monthStats.change > 0 ? "text-primary" : "text-foreground",
                  )}
                >
                  {monthStats.change > 0 ? `+${monthStats.change}` : monthStats.change} pts
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {monthStats.days < 6
                ? "A few more days and this will start to mean something."
                : monthStats.change > 0
                  ? "Your second half of the month is scoring higher than the first. That is the shape you want."
                  : monthStats.change < 0
                    ? "Scores dipped a little in the second half. Often that is harder material rather than lost ground."
                    : "Steady across the month so far."}
            </p>
          </>
        )}
      </Panel>

      <Panel title="How the challenge works">
        <ul className="grid gap-2 sm:grid-cols-2">
          {[
            {
              Icon: CalendarCheck,
              text: "Everyone gets the same set on the same day for a given tier; the sets change at midnight.",
            },
            {
              Icon: Target,
              text: "Beginner, intermediate and expert draw from progressively harder questions, and the higher tiers are longer.",
            },
            {
              Icon: Flame,
              text: "Submitting on consecutive days builds the challenge streak, whichever tier you play. Retakes on the same day are fine; the best score counts.",
            },
            {
              Icon: Trophy,
              text: "Every answer is real evidence: misses land in your mistakes log and reviews, exactly like Quiz Me.",
            },
          ].map(({ Icon, text }) => (
            <li
              key={text}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3 text-sm text-muted-foreground transition-colors hover:border-primary/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="leading-6">{text}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
