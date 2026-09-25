import { useMemo, useState } from "react";
import { ExternalLink, RotateCcw, Send } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { hardwarePhotos } from "@/components/hardware/photos";
import { identificationSet, type IdentificationItem } from "@/data/identification-labs";
import { ownerLessonFor } from "@/lib/owner-lesson-store";
import { useOwnerContentVersion } from "@/hooks/use-owner-content";
import { lessons } from "@/data/static-content";
import { matchesConcept, normalizeText } from "@/lib/fuzzy-match";
import type { Lab, LabAttempt } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";
import { cn } from "@/lib/utils";
import { ReviewConceptLink } from "@/components/learning/remediation-link";
import { getDeepLesson } from "@/data/deep-lessons";
import { lessonSectionId, resolveLessonSection } from "@/lib/lesson-concepts";

/** "Practice in" text from the Labs tab -> an in-app practice page. */
const PRACTICE_PAGES: Array<{ match: RegExp; path: string; label: string }> = [
  { match: /command|terminal|shell|prompt|cli/i, path: "/command-line", label: "Open the command line" },
  { match: /hardware|motherboard|board/i, path: "/explore-hardware", label: "Open Explore hardware" },
  { match: /engine|under the hood|auto/i, path: "/explore-engine", label: "Open Explore engine" },
  { match: /scan|obd/i, path: "/obd-scanner", label: "Open the scan tool" },
];

function practiceLink(value?: string): { path: string; label: string } | undefined {
  const text = (value ?? "").trim();
  if (!text) return undefined;
  if (text.startsWith("/")) return { path: text, label: "Open the practice page" };
  return PRACTICE_PAGES.find((entry) => entry.match.test(text));
}

/**
 * The blank explorer. Numbers stay, labels go, and the learner names each part
 * and says what it does. A new set is drawn on every attempt.
 */
export function IdentificationLab({ lab }: { lab: Lab }) {
  const { user, actions } = useAppState();
  const history = useMemo(
    () => user.labAttempts.filter((item) => item.labId === lab.id),
    [lab.id, user.labAttempts],
  );
  const [round, setRound] = useState(history.length);
  // Redraws once the owner's lessons finish loading.
  useOwnerContentVersion();
  const baseLesson = lessons.find((item) => item.topicId === lab.topicId);
  const ownerRows = ownerLessonFor(lab.topicId)?.depth?.reference?.rows ?? [];
  const lesson = ownerRows.length >= 3
    ? { keyTerms: ownerRows.map((row) => ({ term: row.term, meaning: row.detail })) }
    : baseLesson;
  const set = useMemo(() => identificationSet(lab.topicId, round, lesson), [lab.topicId, round, lesson]);
  const [answers, setAnswers] = useState<Record<string, { name: string; job: string }>>({});
  const [marked, setMarked] = useState<{ score: number; earned: number; total: number } | null>(null);
  const photo = set?.photoKey ? hardwarePhotos[set.photoKey] : undefined;
  const deepLesson = getDeepLesson(lab.topicId);

  if (!set) return null;

  const nameRight = (item: IdentificationItem) => {
    const given = normalizeText(answers[item.id]?.name ?? "");
    if (given.length < 2) return false;
    const expected = normalizeText(item.name).replace(/\(.*?\)/g, "").trim();
    return (
      expected.includes(given) ||
      given.includes(expected) ||
      matchesConcept(given, [item.name], 0.6)
    );
  };
  const jobRight = (item: IdentificationItem) => {
    const given = (answers[item.id]?.job ?? "").trim();
    return given.length >= 12 && matchesConcept(given, item.functionConcepts, 0.4);
  };

  function submit() {
    if (!set) return;
    const perItem = 2;
    const total = set.items.length * perItem;
    const earned = set.items.reduce(
      (sum, item) => sum + (nameRight(item) ? 1 : 0) + (jobRight(item) ? 1 : 0),
      0,
    );
    const score = Math.round((earned / total) * 100);
    const now = new Date().toISOString();
    const attempt: LabAttempt = {
      id: crypto.randomUUID(),
      labId: lab.id,
      topicId: lab.topicId,
      status: score >= lab.masteryScore ? "completed" : "needs_review",
      checklist: Object.fromEntries(
        set.items.map((item) => [item.id, nameRight(item) && jobRight(item)]),
      ),
      reflection: "",
      score,
      maxScore: 100,
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
      ...(score >= lab.masteryScore ? { completedAt: now } : {}),
    };
    actions.addLabAttempt(attempt);
    if (score >= lab.masteryScore) {
      actions.settleTopicReview(lab.topicId, "pass");
      const correctItemIds = new Set(set.items.filter((item) => nameRight(item) && jobRight(item)).map((item) => item.id));
      user.mistakes
        .filter((mistake) => !mistake.resolved && mistake.labId === lab.id && (!mistake.questionId || correctItemIds.has(mistake.questionId)))
        .forEach((mistake) => actions.setMistakeResolved(mistake.id, true));
    } else {
      set.items.filter((item) => !nameRight(item) || !jobRight(item)).forEach((item) => {
        actions.recordMistake({
          topicId: lab.topicId,
          activity: "lab",
          category: !nameRight(item) ? "didnt_know_fact" : "misunderstood_concept",
          severity: "medium",
          labId: lab.id,
          questionId: item.id,
          createdAt: now,
        });
      });
      actions.ensureReview({ topicId: lab.topicId });
    }
    setMarked({ score, earned, total });
    toast(score >= lab.masteryScore ? `Identification passed at ${score}%.` : `${score}%. A new set is one tap away.`);
  }

  function again() {
    setRound((current) => current + 1);
    setAnswers({});
    setMarked(null);
  }

  return (
    <Panel
      title={set.heading}
      description="Work from memory. Type what each number is, then say what it does in your own words. Every attempt uses a different set."
    >
      {photo ? (
        <div className="relative mx-auto max-w-2xl">
          <img
            src={photo.src}
            width={photo.width}
            height={photo.height}
            alt="Unlabelled hardware diagram with numbered parts to identify."
            className="w-full rounded-lg border border-border"
          />
          {set.items.map((item) => (
            <span
              key={item.id}
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
              className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary/70 bg-background/85 text-sm font-bold text-primary shadow-lg ring-2 ring-background/40"
            >
              {item.number}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 space-y-4">
        {set.items.map((item) => {
          const ok = marked ? nameRight(item) : false;
          const jobOk = marked ? jobRight(item) : false;
          const sectionId = item.lessonSectionId ?? lab.lessonSectionId ?? (!item.id.includes("-lab-") ? lessonSectionId(lab.topicId, "key-terms") : undefined);
          const mapped = resolveLessonSection(lab.topicId, sectionId, deepLesson);
          return (
            <div key={item.id} className="rounded-md border border-border p-4">
              <p className="text-sm font-medium">
                {item.number}. {item.clue || "What is this part?"}
              </p>
              {practiceLink(item.practiceIn) ? (
                <Link
                  to={practiceLink(item.practiceIn)!.path}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                >
                  <ExternalLink className="size-3" />
                  {practiceLink(item.practiceIn)!.label}
                </Link>
              ) : null}
              <Input
                className="mt-3"
                aria-label={`Name for item ${item.number}`}
                placeholder="Name it"
                value={answers[item.id]?.name ?? ""}
                disabled={Boolean(marked)}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [item.id]: { job: current[item.id]?.job ?? "", name: event.target.value },
                  }))
                }
              />
              <Textarea
                className="mt-2"
                rows={3}
                aria-label={`What item ${item.number} does`}
                placeholder="What does it do?"
                value={answers[item.id]?.job ?? ""}
                disabled={Boolean(marked)}
                onChange={(event) =>
                  setAnswers((current) => ({
                    ...current,
                    [item.id]: { name: current[item.id]?.name ?? "", job: event.target.value },
                  }))
                }
              />
              {marked ? (
                <div className="mt-3 space-y-1 text-sm">
                  <p className={cn(ok ? "text-success" : "text-destructive")}>
                    {ok ? "Named correctly." : `That one is the ${item.name}.`}
                  </p>
                  <p className={cn(jobOk ? "text-success" : "text-destructive")}>
                    {jobOk ? "Your description holds up." : "What it does: "}
                    {jobOk ? null : <span className="text-muted-foreground">{item.answerFunction}</span>}
                  </p>
                </div>
              ) : null}
              {marked && (!ok || !jobOk) && mapped && sectionId ? <ReviewConceptLink topicId={lab.topicId} conceptId={item.conceptId ?? lab.conceptId ?? `${lab.topicId}:lab:${item.id}`} sectionId={sectionId} anchor={mapped.anchor} sourceKind="lab" sourceItemId={item.id} /> : null}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {marked ? (
          <>
            <p className="text-sm">
              {marked.earned} of {marked.total} points, {marked.score}%.
            </p>
            <Button variant="secondary" onClick={again}>
              <RotateCcw /> New set
            </Button>
          </>
        ) : (
          <Button onClick={submit}>
            <Send /> Submit
          </Button>
        )}
      </div>
    </Panel>
  );
}
