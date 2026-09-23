import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { LearnerPageSkeleton, PageHeader, Panel, StatCard } from "@/components/page-kit";
import { useAppState } from "@/state/app-state";
import { EXAM_READY_SCORE, certificationStatusLabels, scoreAllCertifications } from "@/lib/certification-engine";
import type { CertificationReadiness } from "@/lib/certification-engine";
import { certificationsByLevel, certificationTopics } from "@/lib/cert-path";
import { selectedCertification } from "@/lib/adaptive-path";

export const Route = createFileRoute("/certifications/")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Certifications | IT PATH" },
      {
        name: "description",
        content: "Every certification in the IT PATH programme, grouped by level, with topic coverage and readiness.",
      },
      { property: "og:title", content: "Certifications | IT PATH" },
      {
        property: "og:description",
        content: "Level, topic coverage, readiness and status for each CompTIA certification you are working towards.",
      },
    ],
  }),
  component: CertificationsIndex,
});

function CertCard({ row, focused }: { row: CertificationReadiness; focused: boolean }) {
  const topicCount = certificationTopics(row.certification.id).length;
  return (
    <Link
      to="/certifications/$certId"
      params={{ certId: row.certification.id }}
      className={focused ? "block rounded-xl border border-primary bg-primary/5 p-4 hover:bg-secondary/50" : "block rounded-xl border border-border bg-background/40 p-4 hover:bg-secondary/50"}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <span className="min-w-0">
          <span className="block truncate font-medium">{row.certification.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.certification.code} · {topicCount} topic{topicCount === 1 ? "" : "s"}
          </span>
        </span>
        <span className="text-sm font-semibold tabular-nums">{row.overall}%</span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{row.certification.description}</p>
      <p className="mt-2 text-xs">
        {focused ? "Your selected certification · " : ""}
        {certificationStatusLabels[row.status]}
        {row.hasEvidence ? "" : " · no evidence recorded yet"}
      </p>
    </Link>
  );
}

function CertificationsIndex() {
  const { user, hydrated } = useAppState();
  const readiness = useMemo(() => scoreAllCertifications(user), [user]);
  const readinessById = useMemo(
    () => new Map(readiness.map((row) => [row.certification.id, row])),
    [readiness],
  );
  const levelGroups = certificationsByLevel();
  const focus = selectedCertification(user.settings);

  if (!hydrated) return <LearnerPageSkeleton rows={6} metrics={3} />;

  return (
    <>
      <PageHeader
        title="Certifications"
        description={`Certifications are grouped by level, from entry-level foundations to advanced specialisations. Open any certification to see its topics, objectives and readiness. Your target is ${user.settings.certificationTarget}.`}
      />

      <p className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        IT PATH does not issue certificates. Readiness here estimates how prepared you are for the
        official vendor exam, which you still need to register for and pass separately.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Certifications tracked" value={readiness.length} />
        <StatCard
          label="Exam ready"
          value={readiness.filter((r) => r.status === "exam_ready").length}
          hint={`Needs curriculum complete and ${EXAM_READY_SCORE}% overall`}
        />
        <StatCard
          label="Passed (confirmed by you)"
          value={readiness.filter((r) => r.status === "exam_passed").length}
        />
      </div>

      <div className="mt-4 grid gap-4">
        {levelGroups.map((group) => (
          <Panel
            key={group.level}
            title={group.label}
            description={`${group.items.length} certification${group.items.length === 1 ? "" : "s"} at this level.`}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {group.items.map((certification) => {
                const row = readinessById.get(certification.id);
                 return row ? <CertCard key={certification.id} row={row} focused={certification.id === focus.id} /> : null;
              })}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
