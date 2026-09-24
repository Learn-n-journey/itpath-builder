import { Textarea } from "@/components/ui/textarea";
import { answerMatches, conceptCoverage } from "@/lib/fuzzy-match";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Key, ListChecks, Wrench } from "lucide-react";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import type { LessonDepth } from "@/data/deep-lessons";
import type { LessonReferenceRow } from "@/data/deep-lessons/types";
import { ReviewConceptLink } from "@/components/learning/remediation-link";
import { lessonSectionId, resolveLessonSection } from "@/lib/lesson-concepts";
import { getDeepLesson } from "@/data/deep-lessons";

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
      <LessonKeyIdeas depth={depth} />
      <LessonWalkthroughPanel depth={depth} />
      <LessonReferencePanel depth={depth} />
      <LessonMisconceptions depth={depth} />
      <LessonCheckYourself depth={depth} />
    </div>
  );
}

export function LessonKeyIdeas({ depth }: { depth: LessonDepth }) {
  if (depth.keyIdeas.length === 0) return null;
  return <Panel title="Key ideas" description="If you remember nothing else from this topic, remember these."><ul className="space-y-3 text-sm leading-7 text-muted-foreground">{depth.keyIdeas.map((idea) => <li key={idea} className="flex gap-3"><Key aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" /><span>{idea}</span></li>)}</ul></Panel>;
}

export function LessonWalkthroughPanel({ depth }: { depth: LessonDepth }) {
  return <Panel title={depth.walkthrough.title} description="A worked example, step by step."><div className="space-y-4 text-sm leading-7 text-muted-foreground"><p className="rounded-lg border border-border bg-secondary/40 p-3 text-foreground">{depth.walkthrough.scenario}</p><ol className="space-y-3">{depth.walkthrough.steps.map((step, index) => <li key={step.label} className="flex gap-3"><span className="mt-0.5 font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span><span><span className="block font-medium text-foreground">{step.label}</span><span>{step.detail}</span></span></li>)}</ol><p className="flex gap-3"><CheckCircle2 aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" /><span><span className="font-medium text-foreground">Outcome: </span>{depth.walkthrough.outcome}</span></p></div></Panel>;
}

export function LessonReferencePanel({ depth }: { depth: LessonDepth }) {
  if (depth.reference.rows.length === 0) return null;
  return <Panel title="Reference" description="Worth keeping at hand while you work."><div className="space-y-6">{groupReference(depth.reference).map((group) => <section key={group.heading || "ungrouped"}>{group.heading ? <h4 className="font-display text-sm font-semibold text-foreground">{group.heading}</h4> : null}<dl className="divide-y divide-border text-sm">{group.rows.map((row) => <div key={`${group.heading}-${row.term}`} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4"><dt className="font-mono text-xs text-foreground sm:text-sm">{row.term}</dt><dd className="leading-7 text-muted-foreground">{row.detail}</dd></div>)}</dl></section>)}</div></Panel>;
}

export function LessonMisconceptions({ depth }: { depth: LessonDepth }) {
  if (depth.misconceptions.length === 0) return null;
  return <Panel title="Common misunderstandings" description="What most beginners get wrong here."><ul className="space-y-4 text-sm leading-7">{depth.misconceptions.map((item) => <li key={item.claim} className="space-y-1"><p className="flex gap-3 text-foreground"><AlertTriangle aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" /><span>{item.claim}</span></p><p className="pl-7 text-muted-foreground">{item.correction}</p></li>)}</ul></Panel>;
}

export function LessonCheckYourself({ depth, topicId }: { depth: LessonDepth; topicId?: string }) {
  if (depth.checkYourself.length === 0) return null;
  return <div id="check-yourself" className="scroll-mt-24"><Panel title="Check yourself" description="Write your answer. It is checked on the general idea. Practice only."><ul className="space-y-3">{depth.checkYourself.map((check, index) => <CheckRow key={check.question} check={check} index={index} {...(topicId ? { topicId } : {})} />)}</ul></Panel></div>;
}

function CheckRow({ check, index, topicId }: { check: LessonDepth["checkYourself"][number]; index: number; topicId?: string }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const sectionId = topicId ? check.lessonSectionId ?? lessonSectionId(topicId, "core") : undefined;
  const mapped = topicId && sectionId ? resolveLessonSection(topicId, sectionId, getDeepLesson(topicId)) : undefined;
  const submit = () => {
    const text = answer.trim();
    if (text.split(/\s+/).length < 2) { setResult(false); return; }
    setResult(answerMatches(text, check.answer) || conceptCoverage(check.answer, text) >= 0.4);
  };
  return (
    <li className="rounded-lg border border-border p-3">
      <p className="flex gap-3 text-sm leading-7 text-foreground">
        <ListChecks aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" />
        <span>{check.question}</span>
      </p>
      <Textarea aria-label={`Your answer to check ${index + 1}`} className="mt-2" rows={3} value={answer} onChange={(event) => { setAnswer(event.target.value); setResult(null); }} />
      <Button className="mt-2" size="sm" onClick={submit} disabled={!answer.trim()}>Check answer</Button>
      {result !== null ? (
        <div role="status" className="mt-2 space-y-1 pl-1 text-sm leading-7">
          <p className={result ? "text-success" : "text-muted-foreground"}>{result ? "That matches the idea." : "Not quite the idea yet. Try again."}</p>
          {result ? <p className="flex gap-3 text-muted-foreground"><Wrench aria-hidden className="mt-1.5 size-4 shrink-0 text-primary" /><span>{check.answer}</span></p> : null}
        </div>
      ) : null}
      {result === false && mapped && topicId && sectionId ? <ReviewConceptLink topicId={topicId} conceptId={check.conceptId ?? `${topicId}:check:${index + 1}`} sectionId={sectionId} anchor={mapped.anchor} sourceKind="check-yourself" sourceItemId={`check-${index + 1}`} /> : null}
    </li>
  );
}
