import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSkill, skillNodes } from "@/data/prerequisite-graph";
import { getTopic } from "@/lib/app-data/selectors";
import type { MistakeCause } from "@/lib/app-data/types";
import {
  mistakeActivityLabels,
  mistakeCauseLabels,
  summarizeMistakes,
} from "@/lib/mistake-engine";
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

  const now = Date.now();
  const due = user.reviews.filter((r) => new Date(r.dueAt).getTime() <= now);
  const summary = useMemo(() => summarizeMistakes(user), [user]);

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Scheduled" value={user.reviews.length} />
        <StatCard label="Due now" value={due.length} />
        <StatCard label="Open mistakes" value={summary.open} />
        <StatCard label="Logged mistakes" value={summary.total} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Recommended review">
          {summary.recommendedSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing recommended. Recommendations appear once mistakes are recorded from quizzes,
              recall, or assignments.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {summary.recommendedSkills.map((entry) => (
                <li key={entry.skill.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{entry.skill.title}</span>
                    <Badge variant="outline">weakness {entry.score}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{entry.skill.summary}</p>
                  {entry.skill.topicId ? (
                    <Button asChild size="sm" variant="secondary" className="mt-2">
                      <Link to="/topics/$topicId" params={{ topicId: entry.skill.topicId }}>
                        Open {topicTitle(entry.skill.topicId)}
                      </Link>
                    </Button>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      No dedicated topic yet — practise this sub-skill inside its parent topic.
                    </p>
                  )}
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
            body="Review items are created automatically once you complete topics and quizzes."
          />
        ) : (
          <Panel title="Scheduled reviews">
            <ul className="divide-y divide-border text-sm">
              {user.reviews.slice(0, 12).map((review) => (
                <li key={review.id} className="flex justify-between py-2">
                  <span>{topicTitle(review.topicId)}</span>
                  <span className="text-muted-foreground">
                    due {new Date(review.dueAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

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
