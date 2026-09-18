import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Award, Lock } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { ReadinessPanel } from "@/components/readiness-panel";
import { StreakPanel } from "@/components/streak-panel";
import { certifications } from "@/data/static-content";
import { allBadges, type Badge, type BadgeGroup } from "@/lib/badges";
import { buildReadinessReport } from "@/lib/readiness-engine";
import { cn } from "@/lib/utils";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/achievements")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Achievements | IT PATH" },
      {
        name: "description",
        content:
          "Your exam readiness, your study streak and every badge earned from recorded work: sections mastered, exams passed, questions answered.",
      },
      { property: "og:title", content: "Achievements | IT PATH" },
      {
        property: "og:description",
        content: "Readiness, streak and badges, all earned from work you have actually recorded.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AchievementsPage,
});

const GROUPS: BadgeGroup[] = ["Mastery", "Consistency", "Practice"];

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        badge.earned ? "border-primary/40 bg-primary/5" : "border-dashed border-border opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg",
            badge.earned ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
          )}
        >
          {badge.earned ? <Award className="size-4" aria-hidden /> : <Lock className="size-4" aria-hidden />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{badge.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{badge.requirement}</p>
          <p className="mt-2 text-xs tabular-nums text-muted-foreground">{badge.evidence}</p>
        </div>
      </div>
    </div>
  );
}

function AchievementsPage() {
  const { user } = useAppState();

  const certification = useMemo(() => {
    const target = user.settings.certificationTarget;
    return (
      certifications.find((item) => item.id === target || item.title === target) ?? certifications[0]
    );
  }, [user.settings.certificationTarget]);

  const report = useMemo(
    () => (certification ? buildReadinessReport(user, certification) : null),
    [user, certification],
  );

  const badges = useMemo(() => allBadges(user), [user]);
  const earned = badges.filter((badge) => badge.earned).length;

  return (
    <>
      <PageHeader
        title="Achievements"
        description={`Everything here comes from work you have recorded. ${earned} of ${badges.length} badges earned so far.`}
      />

      {report ? <ReadinessPanel report={report} className="mb-6" /> : null}

      <div className="mb-6">
        <StreakPanel />
      </div>

      {GROUPS.map((group) => {
        const list = badges.filter((badge) => badge.group === group);
        return (
          <Panel
            key={group}
            title={group}
            description={`${list.filter((badge) => badge.earned).length} of ${list.length} earned.`}
            className="mb-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </Panel>
        );
      })}

      <Panel title="Want the next one?" description="The quickest way to move a badge along.">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/my-path">Open My Path</Link>
          </Button>
          <Button asChild size="sm" variant="secondary">
            <Link to="/flashcards">Run some flashcards</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/daily-challenge">Today's challenge</Link>
          </Button>
        </div>
      </Panel>
    </>
  );
}
