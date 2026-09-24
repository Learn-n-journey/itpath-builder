import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Circle } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { identificationLabId } from "@/data/identification-labs";
import { masteryGate } from "@/lib/mastery-gate";
import { useAppState } from "@/state/app-state";

/**
 * What this section asks for before the next one opens: the topic quiz, and
 * nothing else. The lab is offered underneath as optional practice.
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
  if (competencyKey === "practicalAbility") {
    return (
      <Link to="/labs" search={{ lab: identificationLabId(topicId) }} className={ROW}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/section-quiz/$topicId" params={{ topicId }} className={ROW}>
      {children}
    </Link>
  );
}

export function MasteryChecklist({ topicId }: { topicId: string }) {
  const { user } = useAppState();
  const gate = useMemo(() => masteryGate(user, topicId), [user, topicId]);
  const required = gate.competencies.filter((item) => item.required);
  const extras = gate.competencies.filter((item) => item.optional && item.available > 0);

  return (
    <Panel
      title="What opens the next section"
      help="Score 80% or better on every required activity. Practice work and labs never hold you back."
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
                  {item.met ? "Open it again" : "Open the quiz"}
                </span>
              </span>
            </CompetencyLink>
          </li>
        ))}
      </ul>
      {extras.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">Extra practice, not needed to move on</p>
          <ul className="mt-2 space-y-3">
            {extras.map((item) => (
              <li key={item.key} className="text-sm">
                <CompetencyLink topicId={topicId} competencyKey={item.key}>
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground"
                    aria-hidden
                  >
                    {item.met ? <Check className="size-3" /> : <Circle className="size-2 fill-current" />}
                  </span>
                  <span>
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="block text-muted-foreground">
                      {item.met ? item.detail : item.requirement}
                    </span>
                  </span>
                </CompetencyLink>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link to="/section-quiz/$topicId" params={{ topicId }}>
            Open the topic quiz
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link to="/labs" search={{ lab: identificationLabId(topicId) }}>
            Lab (optional)
          </Link>
        </Button>
      </div>
    </Panel>
  );
}
