/**
 * Explainability surface for the learning intelligence engine.
 *
 * Every recommendation the engine makes can be opened up here: the state it
 * assigned, how much evidence stands behind it, the competing explanations it
 * weighed, and the full Observe → Adapt trail.
 */
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, ChevronRight, FlaskConical } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIntelligence } from "@/hooks/use-intelligence";
import { DIAGNOSIS_LABEL, STAGE_LABEL } from "@/lib/intelligence/types";
import { STATE_LABEL, STATE_MEANING, STATE_ORDER } from "@/lib/intelligence/states";
import type { ConceptIntel } from "@/lib/intelligence/types";

function ConceptCard({ concept }: { concept: ConceptIntel }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-lg border border-border/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/topics/$topicId"
            params={{ topicId: concept.topicId }}
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            {concept.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{concept.evidence}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Badge variant="outline">{STATE_LABEL[concept.state]}</Badge>
          <Badge variant="secondary">{DIAGNOSIS_LABEL[concept.diagnosis]}</Badge>
        </div>
      </div>

      <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
        <div>
          <dt>Certainty</dt>
          <dd className="text-foreground">{Math.round(concept.certainty * 100)}%</dd>
        </div>
        <div>
          <dt>Evidence</dt>
          <dd className="text-foreground">
            {concept.evidenceStrength.level} · {concept.evidenceStrength.independentSources} source(s)
          </dd>
        </div>
        <div>
          <dt>Transfer</dt>
          <dd className="text-foreground">
            {concept.transfer.attemptedContexts === 0
              ? "untested"
              : `${Math.round(concept.transfer.score * 100)}%`}
          </dd>
        </div>
        <div>
          <dt>Trend</dt>
          <dd className="text-foreground">
            {concept.velocity === 0 ? "no trend yet" : `${concept.velocity > 0 ? "+" : ""}${concept.velocity} pts/week`}
          </dd>
        </div>
      </dl>

      {concept.isDiagnostic && concept.diagnosticTest ? (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-border/70 bg-muted/40 p-3 text-xs">
          <FlaskConical className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-foreground">Check first: </span>
            {concept.diagnosticTest.question} {concept.diagnosticTest.instruction}
          </span>
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={concept.route === "/topics/$topicId" ? "/topics/$topicId" : concept.route} params={{ topicId: concept.topicId }}>
            {concept.instruction}
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen((value) => !value)}>
          {open ? <ChevronDown className="mr-1 size-3.5" aria-hidden /> : <ChevronRight className="mr-1 size-3.5" aria-hidden />}
          {open ? "Hide the reasoning" : "Why this?"}
        </Button>
      </div>

      {open ? (
        <ol className="mt-3 space-y-2 border-t border-border/60 pt-3 text-xs">
          {concept.trace.map((step) => (
            <li key={step.stage}>
              <span className="font-medium text-foreground">{STAGE_LABEL[step.stage]}: </span>
              <span className="text-muted-foreground">{step.detail}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </li>
  );
}

export function IntelligenceExplainer({ limit = 3 }: { limit?: number }) {
  const intel = useIntelligence();
  const items = intel.queue.slice(0, limit);
  const present = STATE_ORDER.filter((state) => intel.stateMix[state] > 0);

  return (
    <div className="space-y-6">
      <Panel
        title="Where your concepts stand"
        description="Each concept climbs this ladder only when the evidence for the next rung exists."
      >
        <ul className="space-y-2 text-sm">
          {present.map((state) => (
            <li key={state} className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{STATE_LABEL[state]}</span>
              <span className="text-xs text-muted-foreground">{STATE_MEANING[state]}</span>
              <span className="tabular-nums text-muted-foreground">{intel.stateMix[state]}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          {Math.round(intel.pathFunctional * 100)}% of {intel.certificationTitle} concepts are functional or better.
        </p>
      </Panel>

      {items.length > 0 ? (
        <Panel
          title="Why these are next"
          description="The engine's own reasoning, traceable to the work you recorded."
        >
          <ul className="space-y-3">
            {items.map((concept) => (
              <ConceptCard key={concept.topicId} concept={concept} />
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}
