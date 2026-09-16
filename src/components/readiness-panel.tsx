import { Link } from "@tanstack/react-router";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { EXAM_READY_SCORE } from "@/lib/certification-engine";
import {
  readinessBandAdvice,
  readinessBandLabels,
  type ReadinessReport,
} from "@/lib/readiness-engine";
import { formatStudyTime } from "@/lib/study-time";

function Ring({ value }: { value: number }) {
  return (
    <div
      className="relative grid size-24 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${value * 3.6}deg, var(--secondary) 0deg)`,
      }}
      role="img"
      aria-label={`Readiness ${value} percent`}
    >
      <div className="grid size-[76px] place-items-center rounded-full bg-card">
        <span className="font-display text-xl font-semibold tabular-nums">{value}%</span>
      </div>
    </div>
  );
}

/** Headline readiness verdict for one certification, with what is holding it back. */
export function ReadinessPanel({
  report,
  className,
  showLink = true,
}: {
  report: ReadinessReport;
  className?: string;
  showLink?: boolean;
}) {
  const { readiness } = report;

  return (
    <Panel
      className={className}
      title={`Exam readiness: ${report.certification.title}`}
      description={`${readinessBandLabels[report.band]}, ${readinessBandAdvice[report.band]}`}
    >
      <div className="flex flex-wrap items-center gap-5">
        <Ring value={readiness.overall} />
        <div className="min-w-0 grid gap-1 text-sm">
          <p>
            <span className="font-medium tabular-nums">{report.pointsToReady}</span>{" "}
            <span className="text-muted-foreground">
              points to the {EXAM_READY_SCORE}% exam-ready bar
            </span>
          </p>
          <p className="text-muted-foreground">
            {readiness.coverage === 0
              ? "Nothing recorded for this exam yet, so there is nothing to judge."
              : `Average of ${readiness.performance}% on the work you have done and ${readiness.coverage}% of the exam covered`}
          </p>
          <p className="text-muted-foreground">
            {report.topicsDone} of {report.topicsTotal} topics finished. Learn at your own pace, the score grows as the work does.
          </p>
        </div>
      </div>

      {report.blockers.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What is holding the score back
          </p>
          <ul className="mt-2 space-y-2">
            {report.blockers.map((factor) => (
              <li key={factor.label}>
                <Link
                  to={factor.to}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-3 py-2 hover:bg-secondary"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {factor.label} · {factor.score}%
                    </span>
                    <span className="block text-xs text-muted-foreground">{factor.fix}</span>
                  </span>
                  <span className="shrink-0 text-xs text-primary">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          Every measured component is at or above the exam-ready bar.
        </p>
      )}

      {report.strengths.length > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Already strong: {report.strengths.map((factor) => factor.label).join(", ")}.
        </p>
      ) : null}

      {showLink ? (
        <div className="mt-4">
          <Button asChild size="sm" variant="secondary">
            <Link to="/certifications/$certId" params={{ certId: report.certification.id }}>
              Full breakdown
            </Link>
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
