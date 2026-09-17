import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { useAppState } from "@/state/app-state";
import {
  evidenceSourceLabels,
  recommendActivities,
  scoreSkills,
  scoreTracks,
  type SkillScore,
} from "@/lib/skills-engine";
import { SectionTabs, PROGRESS_TABS } from "@/components/layout/section-tabs";

export const Route = createFileRoute("/career-skills")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Career Skills | IT PATH" },
      { name: "description", content: "Skill scores and job readiness calculated from your recorded work." },
      { property: "og:title", content: "Career Skills | IT PATH" },
      { property: "og:description", content: "Evidence-based skill tracking across thirteen IT skill areas." },
    ],
  }),
  component: CareerSkills,
});

function Meter({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-secondary" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
    </div>
  );
}

function SkillRow({ skill, open, onToggle }: { skill: SkillScore; open: boolean; onToggle: () => void }) {
  return (
    <li className="border-t border-border/60 py-3 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{skill.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {skill.hasEvidence
              ? `${skill.accuracy}% accuracy across ${skill.coveredCount} of ${skill.availableCount} available activit${skill.availableCount === 1 ? "y" : "ies"} · ${skill.sources
                  .map((s) => evidenceSourceLabels[s])
                  .join(", ")}`
              : "No evidence yet"}
          </p>
        </div>
        <span className="font-display text-sm font-semibold tabular-nums">{skill.score}%</span>
      </button>
      <div className="mt-2">
        <Meter value={skill.score} />
      </div>
      {open ? (
        skill.hasEvidence ? (
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            {skill.evidence.map((item) => (
              <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <span className="min-w-0">
                  <span className="text-foreground">{evidenceSourceLabels[item.source]}</span>, {item.label}
                </span>
                <span className="tabular-nums">{item.score}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Scores appear once this skill is exercised in Learn, Labs, Practice, Quizzes, Troubleshooting or Career Mode.
          </p>
        )
      ) : null}
    </li>
  );
}

function CareerSkills() {
  const { user } = useAppState();
  const [openSkill, setOpenSkill] = useState<string | null>(null);

  const skills = useMemo(() => scoreSkills(user), [user]);
  const tracks = useMemo(() => scoreTracks(skills), [skills]);
  const recommendations = useMemo(() => recommendActivities(user, skills), [user, skills]);

  const evidenceTotal = skills.reduce((sum, s) => sum + s.evidenceCount, 0);
  const measured = skills.filter((s) => s.hasEvidence).length;
  const weak = skills.filter((s) => s.score < 60);

  return (
    <>
      <SectionTabs tabs={PROGRESS_TABS} />
      <PageHeader
        title="Career Skills"
        description="Every score below is calculated from work you actually recorded. Nothing is estimated."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Skills measured" value={`${measured}/${skills.length}`} hint="Skills with recorded evidence" />
        <StatCard label="Evidence items" value={evidenceTotal} hint="Across all activity types" />
        <StatCard label="Weak areas" value={weak.length} hint="Below 60%" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Skill areas" description="Tap a skill to see the evidence behind its score.">
          <ul>
            {skills.map((skill) => (
              <SkillRow
                key={skill.skillId}
                skill={skill}
                open={openSkill === skill.skillId}
                onToggle={() => setOpenSkill(openSkill === skill.skillId ? null : skill.skillId)}
              />
            ))}
          </ul>
        </Panel>

        <div className="grid gap-4 content-start">
          <Panel title="Job readiness" description="Weighted by how much each skill matters in that role.">
            <ul className="space-y-4">
              {tracks.map((track) => (
                <li key={track.track}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                    <p className="truncate text-sm font-medium">{track.label}</p>
                    <span className="font-display text-sm font-semibold tabular-nums">{track.score}%</span>
                  </div>
                  <div className="mt-2">
                    <Meter value={track.score} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {track.evidenceCount === 0
                      ? "No evidence recorded for this role yet."
                      : `Average of ${track.performance}% on work done and ${track.coverage}% of the role covered · weak: ${
                          track.weakSkills.length === 0
                            ? "none"
                            : track.weakSkills.slice(0, 3).map((s) => s.label).join(", ")
                        }`}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Weak areas" description="Lowest scoring skills first.">
            {weak.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No weak areas: every skill is at 60% or above from recorded evidence.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {[...weak]
                  .sort((a, b) => a.score - b.score)
                  .map((skill) => (
                    <li key={skill.skillId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                      <span className="min-w-0 truncate">{skill.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {skill.hasEvidence ? `${skill.score}%` : "no evidence"}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recommended activities" description="Real content that will produce the missing evidence.">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing outstanding. Keep reviewing to hold these scores.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {recommendations.slice(0, 8).map((rec) => (
                  <li key={rec.id}>
                    {rec.topicId ? (
                      <Link
                        to="/topics/$topicId"
                        params={{ topicId: rec.topicId }}
                        className="font-medium text-primary hover:underline"
                      >
                        {rec.action}: {rec.title}
                      </Link>
                    ) : (
                      <Link to={rec.href} className="font-medium text-primary hover:underline">
                        {rec.action}: {rec.title}
                      </Link>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{rec.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
