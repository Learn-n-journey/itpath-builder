import { useState } from "react";
import { AlertTriangle, CheckCircle2, Key, ListChecks, Wrench } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import type { LessonDepth } from "@/data/deep-lessons";
import type { LessonReferenceRow } from "@/data/deep-lessons/types";

/**
 * Splits the reference rows into sub-sections by their heading, keeping the
 * order they were written in. Rows sharing a heading are combined under it;
 * rows with no heading fall under the lesson's own reference heading.
 */
function groupReference(reference: LessonDepth["reference"]): {
  heading: string;
  rows: LessonReferenceRow[];
}[] {
  const groups: { heading: string; rows: LessonReferenceRow[] }[] = [];
  for (const row of reference.rows) {
    const heading = (row.group ?? "").trim();
    const existing = groups.find((group) => group.heading.toLowerCase() === heading.toLowerCase());
    if (existing) existing.rows.push(row);
    else groups.push({ heading, rows: [row] });
  }
  if (groups.length === 1 && !groups[0]!.heading && reference.heading !== "Reference") {
    groups[0]!.heading = reference.heading;
  }
  return groups;
}

/**
 * The depth layer of a lesson: the parts that turn reading into teaching.
 * Rendered under the main reading on the Learn tab of a topic.
 */
export function LessonDepthReading({ depth }: { depth: LessonDepth }) {
  return (
    <div className="space-y-4">
      <Panel
        title="Key ideas"
        description="If you remember nothing else from this topic, remember these."
      >
        <ul className="space-y-3 text-sm leading-7 text-muted-foreground">
          {depth.keyIdeas.map((idea) => (
            <li key={idea} className="flex gap-3">
              <Key aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" />
              <span>{idea}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title={depth.walkthrough.title} description="A worked example, step by step.">
        <div className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p className="rounded-lg border border-border bg-secondary/40 p-3 text-foreground">
            {depth.walkthrough.scenario}
          </p>
          <ol className="space-y-3">
            {depth.walkthrough.steps.map((step, index) => (
              <li key={step.label} className="flex gap-3">
                <span className="mt-0.5 font-mono text-xs text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block font-medium text-foreground">{step.label}</span>
                  <span>{step.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="flex gap-3">
            <CheckCircle2 aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" />
            <span>
              <span className="font-medium text-foreground">Outcome: </span>
              {depth.walkthrough.outcome}
            </span>
          </p>
        </div>
      </Panel>

      <Panel title="Reference" description="Worth keeping at hand while you work.">
        <div className="space-y-6">
          {groupReference(depth.reference).map((group) => (
            <section key={group.heading || "ungrouped"}>
              {group.heading ? (
                <h4 className="font-display text-sm font-semibold text-foreground">{group.heading}</h4>
              ) : null}
              <dl className="divide-y divide-border text-sm">
                {group.rows.map((row) => (
                  <div
                    key={`${group.heading}-${row.term}`}
                    className="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4"
                  >
                    <dt className="font-mono text-xs text-foreground sm:text-sm">{row.term}</dt>
                    <dd className="leading-7 text-muted-foreground">{row.detail}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Panel>

      <Panel title="Common misunderstandings" description="What most beginners get wrong here.">
        <ul className="space-y-4 text-sm leading-7">
          {depth.misconceptions.map((item) => (
            <li key={item.claim} className="space-y-1">
              <p className="flex gap-3 text-foreground">
                <AlertTriangle aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" />
                <span>{item.claim}</span>
              </p>
              <p className="pl-7 text-muted-foreground">{item.correction}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <div id="check-yourself" className="scroll-mt-24">
        <Panel
          title="Check yourself"
          description="Answer in your head first, then reveal. This is not scored."
        >
          <ul className="space-y-3">
            {depth.checkYourself.map((check) => (
              <CheckRow key={check.question} question={check.question} answer={check.answer} />
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function CheckRow({ question, answer }: { question: string; answer: string }) {
  const [shown, setShown] = useState(false);
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="flex gap-3 text-sm leading-7 text-foreground">
          <ListChecks aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" />
          <span>{question}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={() => setShown((value) => !value)}>
          {shown ? "Hide" : "Show answer"}
        </Button>
      </div>
      {shown ? (
        <p className="mt-2 flex gap-3 pl-7 text-sm leading-7 text-muted-foreground">
          <Wrench aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" />
          <span>{answer}</span>
        </p>
      ) : null}
    </li>
  );
}
