import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { PageHeader, Panel, StatCard } from "@/components/page-kit";
import { useAppState } from "@/state/app-state";
import { EXAM_READY_SCORE, certificationStatusLabels, scoreAllCertifications } from "@/lib/certification-engine";
import type { CertificationReadiness } from "@/lib/certification-engine";

export const Route = createFileRoute("/certifications/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Certifications — IT PATH" },
      {
        name: "description",
        content: "Every certification in the IT PATH programme, with the curriculum months each one covers.",
      },
      { property: "og:title", content: "Certifications — IT PATH" },
      {
        property: "og:description",
        content: "Month blocks, readiness and status for each CompTIA certification you are working towards.",
      },
    ],
  }),
  component: CertificationsIndex,
});

function monthLabel(months: number[]) {
  if (months.length === 0) return "Optional specialisation";
  if (months.length === 1) return `Month ${months[0]}`;
  return `Months ${months[0]}–${months[months.length - 1]}`;
}

function CertCard({ row }: { row: CertificationReadiness }) {
  const months = row.certification.months ?? [];
  return (
    <Link
      to="/certifications/$certId"
      params={{ certId: row.certification.id }}
      className="block rounded-xl border border-border bg-background/40 p-4 hover:bg-secondary/50"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <span className="min-w-0">
          <span className="block truncate font-medium">{row.certification.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {row.certification.code} · {monthLabel(months)}
          </span>
        </span>
        <span className="text-sm font-semibold tabular-nums">{row.overall}%</span>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{row.certification.description}</p>
      <p className="mt-2 text-xs">
        {certificationStatusLabels[row.status]}
        {row.hasEvidence ? "" : " · no evidence recorded yet"}
      </p>
    </Link>
  );
}

function CertificationsIndex() {
  const { user } = useAppState();
  const readiness = useMemo(() => scoreAllCertifications(user), [user]);

  const scheduled = readiness
    .filter((row) => (row.certification.months ?? []).length > 0)
    .sort((a, b) => (a.certification.months![0] ?? 0) - (b.certification.months![0] ?? 0));
  const electives = readiness.filter((row) => (row.certification.months ?? []).length === 0);

  return (
    <>
      <PageHeader
        title="Certifications"
        description={`The 24-month path is segmented into certification blocks. Open any certification to see its months, topics, objectives and readiness. Your target is ${user.settings.certificationTarget}.`}
      />

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
        <Panel title="Scheduled path" description="Months 1 to 24, in the order you study them.">
          <div className="grid gap-3 sm:grid-cols-2">
            {scheduled.map((row) => (
              <CertCard key={row.certification.id} row={row} />
            ))}
          </div>
        </Panel>

        <Panel
          title="Optional specialisations"
          description="Not scheduled in the two-year path. Open one to track objectives and record an exam result."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {electives.map((row) => (
              <CertCard key={row.certification.id} row={row} />
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
