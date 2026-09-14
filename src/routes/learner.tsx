import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Clock, GitBranch, Target, TrendingDown, TrendingUp } from "lucide-react";

import { EmptyState, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { ProGate } from "@/components/pro-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLearnerModel } from "@/hooks/use-learner-model";
import type { ConceptProfile } from "@/lib/learner-model";

export const Route = createFileRoute("/learner")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Learner Profile — IT PATH" },
      {
        name: "description",
        content:
          "Your concept-by-concept learner profile: mastery, confidence, retention, response time, error patterns and what to study next.",
      },
      { property: "og:title", content: "Learner Profile — IT PATH" },
      {
        property: "og:description",
        content:
          "A live model of what you know, what is fading and which concept to work on next.",
      },
    ],
  }),
  component: LearnerPage,
});

const ACTION_LABEL: Record<ConceptProfile["action"], string> = {
  learn: "Learn",
  practice: "Practice",
  review: "Review",
  test: "Test",
  maintain: "Maintain",
};

function pct(value: number): number {
  return Math.round(value * 100);
}

function ConceptRow({ profile }: { profile: ConceptProfile }) {
  const unproven = profile.prerequisites.filter((item) => !item.satisfied);
  return (
    <li className="rounded-lg border border-border/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/topics/$topicId"
            params={{ topicId: profile.topicId }}
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            {profile.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{profile.reason}</p>
        </div>
        <Badge variant="secondary">{ACTION_LABEL[profile.action]}</Badge>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Mastery</span>
            <span className="tabular-nums">{pct(profile.mastery)}%</span>
          </div>
          <Progress className="mt-1.5" value={pct(profile.mastery)} />
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span className="tabular-nums">{pct(profile.confidence)}%</span>
          </div>
          <Progress className="mt-1.5" value={pct(profile.confidence)} />
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Retention</span>
            <span className="tabular-nums">{pct(profile.retention)}%</span>
          </div>
          <Progress className="mt-1.5" value={pct(profile.retention)} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          {profile.correct}/{profile.attempts} graded correct
        </span>
        {profile.avgResponseSeconds !== null ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden /> {profile.avgResponseSeconds}s average
          </span>
        ) : null}
        {profile.daysSinceExposure !== null ? (
          <span>Last seen {Math.round(profile.daysSinceExposure)} days ago</span>
        ) : (
          <span>Not started</span>
        )}
        {profile.trend !== "unknown" ? (
          <span className="inline-flex items-center gap-1">
            {profile.trend === "slipping" ? (
              <TrendingDown className="size-3" aria-hidden />
            ) : (
              <TrendingUp className="size-3" aria-hidden />
            )}
            {profile.trend}
          </span>
        ) : null}
      </div>

      {profile.errorPatterns.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Repeating: {profile.errorPatterns.map((item) => `${item.label} (${item.count})`).join(", ")}
        </p>
      ) : null}

      {unproven.length > 0 ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <GitBranch className="size-3" aria-hidden /> Build first:{" "}
          {unproven.map((item) => item.title).join(", ")}
        </p>
      ) : null}
    </li>
  );
}

function Section({ title, description, items }: { title: string; description: string; items: ConceptProfile[] }) {
  if (items.length === 0) return null;
  return (
    <Panel title={title} description={description}>
      <ul className="space-y-3">
        {items.map((profile) => (
          <ConceptRow key={profile.topicId} profile={profile} />
        ))}
      </ul>
    </Panel>
  );
}

function LearnerPage() {
  return (
    <ProGate feature="The adaptive learning engine">
      <LearnerContent />
    </ProGate>
  );
}

function LearnerContent() {
  const model = useLearnerModel();
  const fading = model.profiles
    .filter((profile) => profile.attempts > 0 && profile.retention < 0.55)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Learner profile"
        description="A live model of what you know, built only from work you have actually done."
      />

      {model.studied === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          body="Answer a recall question, take a quiz or finish a lab and your profile starts building immediately."
        >
          <Button asChild>
            <Link to="/learn">Start learning</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Concepts studied" value={`${model.studied}`} icon={Brain} />
            <StatCard label="Overall mastery" value={`${pct(model.averageMastery)}%`} hint="Across every available concept" icon={Target} />
            <StatCard label="Evidence recorded" value={`${model.totalSignals}`} icon={Clock} />
            <StatCard label="Fading now" value={`${fading.length}`} icon={TrendingDown} />
          </div>

          <Section
            title="Study next"
            description="Lowest mastery with the clearest gap, in priority order."
            items={model.studyNext}
          />
          <Section
            title="Review before it fades"
            description="Known once, but recall is dropping since your last exposure."
            items={model.reviewNext}
          />
          <Section
            title="Prove it"
            description="Looks solid, needs graded evidence under test conditions."
            items={model.testNext}
          />
        </>
      )}
    </div>
  );
}
