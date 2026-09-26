import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Award, BookOpen, Check, ChevronRight, Flame, Lock, Medal, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { allBadges, badgeCounts, type Badge, type BadgeGroup } from "@/lib/badges";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/achievements")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Achievements | IT PATH" },
      { name: "description", content: "Milestones earned from your recorded learning, practice, and consistency." },
      { property: "og:title", content: "Achievements | IT PATH" },
      { property: "og:description", content: "A record of the work you have put in and the milestones you have earned." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AchievementsPage,
});

const GROUPS: BadgeGroup[] = ["Mastery", "Consistency", "Practice"];
const GROUP_COPY: Record<BadgeGroup, string> = {
  Mastery: "Proof that knowledge is holding up under assessment.",
  Consistency: "Milestones earned by returning and doing the work.",
  Practice: "Evidence from questions, labs, teach-backs, and troubleshooting.",
};
const GROUP_ICON = { Mastery: ShieldCheck, Consistency: Flame, Practice: Target } satisfies Record<BadgeGroup, typeof Trophy>;

function badgeProgress(badge: Badge): { value: number; target: number } | null {
  const match = badge.evidence.match(/(\d+) of (\d+)/);
  if (!match) return badge.earned ? { value: 1, target: 1 } : null;
  return { value: Number(match[1]), target: Number(match[2]) };
}

function progressPercent(badge: Badge) {
  const progress = badgeProgress(badge);
  return progress ? Math.min(100, Math.round((progress.value / Math.max(1, progress.target)) * 100)) : badge.earned ? 100 : 0;
}

function AchievementTile({ badge }: { badge: Badge }) {
  const percent = progressPercent(badge);
  const Icon = GROUP_ICON[badge.group];

  return (
    <article className={cn(
      "group relative min-h-[190px] overflow-hidden rounded-2xl border p-5 transition-all duration-200",
      badge.earned
        ? "border-primary/35 bg-gradient-to-br from-primary/[0.12] via-card/70 to-card/30 shadow-sm hover:-translate-y-0.5 hover:border-primary/55"
        : "border-border/70 bg-card/25 hover:-translate-y-0.5 hover:border-border hover:bg-card/45",
    )}>
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className={cn(
            "relative grid size-14 shrink-0 place-items-center rounded-2xl border shadow-sm",
            badge.earned ? "border-primary/35 bg-primary/15 text-primary" : "border-border bg-background/60 text-muted-foreground",
          )}>
            {badge.earned ? <Icon className="size-6" aria-hidden /> : <Lock className="size-5" aria-hidden />}
            {badge.earned ? <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-background"><Check className="size-3" aria-hidden /></span> : null}
          </div>
          <span className={cn(
            "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
            badge.earned ? "border-primary/25 bg-primary/10 text-primary" : "border-border/80 bg-background/40 text-muted-foreground",
          )}>{badge.earned ? "Unlocked" : `${percent}%`}</span>
        </div>
        <div className="mt-5 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{badge.group}</p>
          <h3 className="mt-1 text-base font-semibold leading-tight">{badge.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{badge.requirement}</p>
        </div>
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary/80"><div className={cn("h-full rounded-full transition-[width]", badge.earned ? "bg-primary" : "bg-muted-foreground/45")} style={{ width: `${percent}%` }} /></div>
          <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">{badge.evidence}</p>
        </div>
      </div>
    </article>
  );
}

function AchievementsPage() {
  const { user } = useAppState();
  const badges = useMemo(() => allBadges(user), [user]);
  const counts = useMemo(() => badgeCounts(user), [user]);
  const [filter, setFilter] = useState<"All" | BadgeGroup>("All");
  const earned = badges.filter((badge) => badge.earned);
  const visible = filter === "All" ? badges : badges.filter((badge) => badge.group === filter);
  const locked = badges.filter((badge) => !badge.earned);
  const nextBadge = [...locked].sort((a, b) => progressPercent(b) - progressPercent(a))[0];
  const completion = badges.length ? Math.round((earned.length / badges.length) * 100) : 0;

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card/70 to-primary/[0.08] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary"><Medal className="size-3.5" aria-hidden /> Achievement cabinet</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">Your work. Proven.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Every unlock comes from recorded learning, practice, or consistency. Nothing here is awarded just for showing up.</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right"><p className="text-4xl font-semibold tabular-nums">{earned.length}<span className="text-lg text-muted-foreground">/{badges.length}</span></p><p className="mt-1 text-xs text-muted-foreground">achievements unlocked</p></div>
            <div className="relative grid size-20 place-items-center rounded-full border border-primary/30 bg-background/50 shadow-sm">
              <svg className="absolute inset-1 size-[72px] -rotate-90" viewBox="0 0 36 36" aria-hidden><path className="stroke-secondary" strokeWidth="3" fill="none" d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831" /><path className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray={`${completion}, 100`} d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0-31.831" /></svg>
              <span className="text-sm font-bold tabular-nums">{completion}%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Award} label="Sections mastered" value={String(counts.sectionsMastered)} detail="section passes at 80%+" />
        <Stat icon={Flame} label="Best streak" value={String(counts.longestStreak)} detail={`current: ${counts.currentStreak} days`} />
        <Stat icon={Target} label="Questions answered" value={String(counts.questionsAnswered)} detail="submitted attempts" />
        <Stat icon={Sparkles} label="Hands-on evidence" value={String(counts.labs + counts.ticketsClosed + counts.teachBacks)} detail="labs, tickets & teach-backs" />
      </section>

      {nextBadge ? (
        <section className="overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.06]">
          <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <div className="grid size-14 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary"><Target className="size-6" aria-hidden /></div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Closest unlock</p><span className="text-[11px] text-muted-foreground">• {progressPercent(nextBadge)}% complete</span></div>
              <h2 className="mt-1 font-display text-xl font-semibold">{nextBadge.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{nextBadge.evidence}</p>
              <div className="mt-3 h-1.5 max-w-xl overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent(nextBadge)}%` }} /></div>
            </div>
            <Button asChild size="sm"><Link to="/my-path">Keep progressing <ChevronRight className="ml-1 size-4" /></Link></Button>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><h2 className="font-display text-2xl font-semibold">Achievement collection</h2><p className="mt-1 text-sm text-muted-foreground">{filter === "All" ? "Explore every milestone and see exactly what remains." : GROUP_COPY[filter]}</p></div>
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-card/30 p-1">
            {(["All", ...GROUPS] as const).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={cn("shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors", filter === item ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>{item}</button>)}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((badge) => <AchievementTile key={badge.id} badge={badge} />)}</div>
      </section>

      <section className="border-t border-border/70 pt-6">
        <div className="mb-4"><h2 className="font-display text-xl font-semibold">Keep building the record</h2><p className="mt-1 text-sm text-muted-foreground">Achievements follow the work you already do across IT PATH.</p></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Action to="/my-path" icon={BookOpen} title="Continue your path" detail="Move the next mastery milestone." />
          <Action to="/flashcards" icon={Award} title="Review flashcards" detail="Strengthen what you have learned." />
          <Action to="/daily-challenge" icon={Target} title="Daily challenge" detail="Put another recorded attempt on the board." />
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail }: { icon: typeof Trophy; label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-border/70 bg-card/25 p-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden /></span><div><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="text-xs font-semibold">{label}</p></div></div><p className="mt-3 text-[11px] text-muted-foreground">{detail}</p></div>;
}

function Action({ to, icon: Icon, title, detail }: { to: "/my-path" | "/flashcards" | "/daily-challenge"; icon: typeof Trophy; title: string; detail: string }) {
  return <Link to={to} className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card/20 p-4 transition-colors hover:border-primary/25 hover:bg-primary/[0.04]"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground group-hover:text-primary"><Icon className="size-4" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted-foreground">{detail}</span></span><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden /></Link>;
}
