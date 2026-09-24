import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Award, BookOpen, Check, Flame, Lock, Target, Trophy } from "lucide-react";

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
  Mastery: "Proof that the material is starting to hold.",
  Consistency: "Milestones built by showing up over time.",
  Practice: "Hands-on work, questions, labs, and troubleshooting.",
};

function badgeProgress(badge: Badge): { value: number; target: number } | null {
  const match = badge.evidence.match(/(\d+) of (\d+)/);
  if (!match) return badge.earned ? { value: 1, target: 1 } : null;
  return { value: Number(match[1]), target: Number(match[2]) };
}

function AchievementTile({ badge }: { badge: Badge }) {
  const progress = badgeProgress(badge);
  const percent = progress ? Math.min(100, Math.round((progress.value / Math.max(1, progress.target)) * 100)) : 0;

  return (
    <article className={cn("group relative overflow-hidden rounded-xl border p-4 transition-colors", badge.earned ? "border-primary/35 bg-primary/[0.06]" : "border-border/70 bg-card/20 hover:bg-card/35")}>
      {badge.earned ? <div className="absolute inset-x-0 top-0 h-px bg-primary" /> : null}
      <div className="flex items-start gap-4">
        <div className={cn("relative grid size-14 shrink-0 place-items-center rounded-xl border", badge.earned ? "border-primary/40 bg-primary/10 text-primary" : "border-border bg-background/50 text-muted-foreground")}>
          {badge.earned ? <Trophy className="size-6" aria-hidden /> : <Lock className="size-5" aria-hidden />}
          {badge.earned ? <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" aria-hidden /></span> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-tight">{badge.title}</h3>
            <span className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wider", badge.earned ? "text-primary" : "text-muted-foreground")}>{badge.earned ? "Unlocked" : "Locked"}</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{badge.requirement}</p>
          {progress ? (
            <div className="mt-3">
              <div className="h-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} /></div>
              <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">{badge.evidence}</p>
            </div>
          ) : <p className="mt-3 text-[11px] text-muted-foreground">{badge.evidence}</p>}
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
  const nextBadge = badges.find((badge) => !badge.earned);
  const completion = badges.length ? Math.round((earned.length / badges.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Your record</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Achievements</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">A permanent record of the work you have actually put in. No participation trophies.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right"><p className="text-3xl font-semibold tabular-nums">{earned.length}<span className="text-base text-muted-foreground">/{badges.length}</span></p><p className="text-xs text-muted-foreground">unlocked</p></div>
          <div className="grid size-14 place-items-center rounded-full border border-primary/30 bg-primary/10 text-sm font-bold text-primary">{completion}%</div>
        </div>
      </header>

      <section className="grid overflow-hidden rounded-xl border border-border/70 bg-card/20 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Trophy} label="Achievements" value={String(earned.length)} detail="earned" />
        <Stat icon={Award} label="Sections mastered" value={String(counts.sectionsMastered)} detail="recorded passes" />
        <Stat icon={Flame} label="Best streak" value={String(counts.longestStreak)} detail="days" />
        <Stat icon={Target} label="Questions answered" value={String(counts.questionsAnswered)} detail="submitted" last />
      </section>

      {nextBadge ? (
        <section className="relative overflow-hidden rounded-xl border border-primary/30 bg-primary/[0.06] p-5">
          <div className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><Target className="size-5" aria-hidden /></div>
              <div><p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Next milestone</p><h2 className="mt-0.5 font-display text-xl font-semibold">{nextBadge.title}</h2><p className="mt-1 text-sm text-muted-foreground">{nextBadge.evidence}</p></div>
            </div>
            <Button asChild size="sm"><Link to="/my-path">Keep progressing</Link></Button>
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="font-display text-xl font-semibold">Badge collection</h2><p className="mt-1 text-sm text-muted-foreground">Every badge is tied to recorded evidence.</p></div>
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-border/70 bg-card/30 p-1">
            {(["All", ...GROUPS] as const).map((item) => (
              <button key={item} type="button" onClick={() => setFilter(item)} className={cn("shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors", filter === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>{item}</button>
            ))}
          </div>
        </div>
        {filter !== "All" ? <p className="mb-3 text-xs text-muted-foreground">{GROUP_COPY[filter]}</p> : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visible.map((badge) => <AchievementTile key={badge.id} badge={badge} />)}</div>
      </section>

      <section className="grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-3">
        <Action to="/my-path" icon={BookOpen} title="Continue your path" detail="Move the next mastery milestone." />
        <Action to="/flashcards" icon={Award} title="Review flashcards" detail="Strengthen what you have learned." />
        <Action to="/daily-challenge" icon={Target} title="Daily challenge" detail="Put another recorded attempt on the board." />
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value, detail, last = false }: { icon: typeof Trophy; label: string; value: string; detail: string; last?: boolean }) {
  return <div className={cn("flex items-center gap-3 p-4", !last && "border-b border-border/70 sm:border-b-0 sm:border-r")}><Icon className="size-5 shrink-0 text-primary" aria-hidden /><div><p className="text-xl font-semibold tabular-nums">{value}</p><p className="text-xs font-medium">{label}</p><p className="text-[11px] text-muted-foreground">{detail}</p></div></div>;
}

function Action({ to, icon: Icon, title, detail }: { to: "/my-path" | "/flashcards" | "/daily-challenge"; icon: typeof Trophy; title: string; detail: string }) {
  return <Link to={to} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary/40"><span className="grid size-9 place-items-center rounded-lg bg-secondary text-muted-foreground group-hover:text-primary"><Icon className="size-4" aria-hidden /></span><span><span className="block text-sm font-semibold">{title}</span><span className="block text-xs text-muted-foreground">{detail}</span></span></Link>;
}
