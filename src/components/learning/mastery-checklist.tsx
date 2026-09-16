import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Check, Circle } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { identificationLabId } from "@/data/identification-labs";
import { masteryGate } from "@/lib/mastery-gate";
import { useAppState } from "@/state/app-state";

/**
 * What this section asks for before the next one opens. Each line stands on
 * its own, so a strong score in one place cannot cover a gap somewhere else.
 */
const ROW = "flex gap-3 rounded-md p-1 -m-1 transition-colors hover:bg-muted/50";

/** Each line goes straight to the work that proves it. */
function CompetencyLink({
  topicId,
  competencyKey,
  children,
}: {
  topicId: string;
  competencyKey: string;
  children: React.ReactNode;
}) {
  if (competencyKey === "knowledge") {
    return (
      <Link to="/section-quiz/$topicId" params={{ topicId }} className={ROW}>
        {children}
      </Link>
    );
  }
  if (competencyKey === "practicalAbility") {
    return (
      <Link to="/labs" search={{ lab: identificationLabId(topicId) }} className={ROW}>
        {children}
      </Link>
    );
  }
  return (
    <Link
      to="/mastery-check/$topicId"
      params={{ topicId }}
      hash={`check-${competencyKey}`}
      className={ROW}
    >
      {children}
    </Link>
  );
}

export function MasteryChecklist({ topicId }: { topicId: string }) {
  const { user } = useAppState();
  const gate = useMemo(() => masteryGate(user, topicId), [user, topicId]);
  const required = gate.competencies.filter((item) => item.required);

  return (
    <Panel
      title="What opens the next section"
      description="Every part below has to stand on its own. An overall percentage is not enough, and anything this section does not contain is not asked for."
    >
      <ul className="space-y-3">
        {required.map((item) => (
          <li key={item.key} className="text-sm">
            <CompetencyLink topicId={topicId} competencyKey={item.key}>
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                  item.met
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-destructive/60 text-destructive"
                }`}
                aria-hidden
              >
                {item.met ? <Check className="size-3" /> : <Circle className="size-2 fill-current" />}
              </span>
              <span>
                <span className={item.met ? "font-medium text-foreground" : "font-medium text-destructive"}>
                  {item.label}
                </span>
                <span className="block text-muted-foreground">
                  {item.met ? item.detail : `${item.requirement} ${item.detail}`}
                </span>
                <span className="mt-1 block text-xs font-medium text-primary">
                  {item.met ? "Open it again" : "Open this check"}
                </span>
              </span>
            </CompetencyLink>
          </li>
        ))}
        <li className="flex gap-3 text-sm">
          <span
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
              gate.delayed.passed
                ? "border-primary bg-primary/15 text-primary"
                : gate.delayed.due
                  ? "border-destructive/60 text-destructive"
                  : "border-border text-muted-foreground"
            }`}
            aria-hidden
          >
            {gate.delayed.passed ? <Check className="size-3" /> : <CalendarClock className="size-3" />}
          </span>
          <span>
            <span className="font-medium text-foreground">Delayed check</span>
            <span className="block text-muted-foreground">{gate.delayed.detail}</span>
          </span>
        </li>
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">{gate.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link to="/mastery-check/$topicId" params={{ topicId }}>
            Open the mastery checks
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/labs" search={{ lab: identificationLabId(topicId) }}>
            Identification lab
          </Link>
        </Button>
      </div>
    </Panel>
  );
}
