import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Edit3, ExternalLink, FileText, PlayCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";



import { MasteryChecklist } from "@/components/learning/mastery-checklist";
import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { AiFeedback, useAiMarking } from "@/components/learning/ai-marking";
import { Panel } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { lessons, resources, type Resource, type Topic } from "@/data/static-content";
import { getGeneratedRecallQuestions } from "@/data/recall-generator";
import { getWorkedExamples } from "@/data/worked-examples";
import { getDeepLesson } from "@/data/deep-lessons";
import { DeepLessonReading } from "@/components/learning/deep-lesson-reading";
import { LessonDepthReading } from "@/components/learning/lesson-depth-reading";
import { WorkedExamples } from "@/components/learning/worked-examples";
import { getLearningModule, getPracticeActivities, getRealWorldScenario, getRecallQuestions } from "@/data/learning-content";
import type { TopicProgress } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";
import { topicMeasures } from "@/lib/mastery-summary";
import { answerMatches, coveredConcepts } from "@/lib/fuzzy-match";
import { ContentReportButton } from "@/components/content-report-button";


/**
 * Meaning-based matching, so a correct answer in the learner's own words counts.
 * An idea is credited when enough of its meaningful words appear (allowing small
 * spelling slips), rather than requiring the exact phrase.
 */
function matchConcepts(answer: string, concepts: string[]) {
  return coveredConcepts(answer, concepts, 0.45);
}

/** Enough of the expected ideas, or an answer that tracks the model answer. */
function passesOffline(answer: string, concepts: string[], modelAnswer?: string) {
  if (concepts.length === 0) return modelAnswer ? answerMatches(answer, modelAnswer) : false;
  const matched = matchConcepts(answer, concepts).length;
  const needed = Math.max(1, Math.ceil(concepts.length / 2));
  if (matched >= needed) return true;
  return modelAnswer ? answerMatches(answer, modelAnswer) : false;
}

/**
 * Nearly there: some of the expected thinking is present, so the answer gets a
 * nudge towards the missing step rather than a plain fail.
 */
function offlineHints(answer: string, concepts: string[]): string[] {
  const matched = new Set(matchConcepts(answer, concepts));
  if (matched.size === 0) return [];
  return concepts
    .filter((concept) => !matched.has(concept))
    .slice(0, 4)
    .map((concept) => `Add the step about ${concept.charAt(0).toLowerCase()}${concept.slice(1)}`);
}




export function TopicLearningExperience({ topic }: { topic: Topic }) {
  const { user, actions } = useAppState();
  const lesson = lessons.find((item) => item.topicId === topic.id);
  const module = getLearningModule(topic.id);
  const deepLesson = getDeepLesson(topic.id);
  // Every recall prompt available for this topic: the authored pair plus ones built from the lesson.
  const recallQuestions = useMemo(
    () => [...getRecallQuestions(topic.id), ...getGeneratedRecallQuestions(topic.id)],
    [topic.id],
  );
  // Show two at a time, skipping the ones already answered well, so a return visit brings new ones.
  // The chosen pair is fixed for the visit, so answering one does not make it vanish before the
  // feedback is read. A page reload (or moving topic) picks the next pair.
  const pickedRecall = useRef<{ topicId: string; ids: string[] } | null>(null);
  const visibleRecall = useMemo(() => {
    if (pickedRecall.current && pickedRecall.current.topicId === topic.id) {
      const kept = pickedRecall.current.ids
        .map((id) => recallQuestions.find((item) => item.id === id))
        .filter((item): item is (typeof recallQuestions)[number] => Boolean(item));
      if (kept.length > 0) return kept;
    }
    const answeredWell = new Set(
      user.recallResponses.filter((item) => item.topicId === topic.id && item.correct).map((item) => item.questionId),
    );
    const fresh = recallQuestions.filter((item) => !answeredWell.has(item.id));
    let chosen = fresh.slice(0, 2);
    if (chosen.length === 0) {
      // Pool exhausted, so come back round to the ones answered longest ago.
      const lastSeen = new Map<string, string>();
      for (const response of user.recallResponses.filter((item) => item.topicId === topic.id)) {
        const current = lastSeen.get(response.questionId);
        if (!current || response.createdAt > current) lastSeen.set(response.questionId, response.createdAt);
      }
      chosen = [...recallQuestions]
        .sort((a, b) => (lastSeen.get(a.id) ?? "").localeCompare(lastSeen.get(b.id) ?? ""))
        .slice(0, 2);
    }
    pickedRecall.current = { topicId: topic.id, ids: chosen.map((item) => item.id) };
    return chosen;
  }, [recallQuestions, user.recallResponses, topic.id]);

  const practiceActivities = getPracticeActivities(topic.id);
  const practice = practiceActivities[0];
  const scenario = getRealWorldScenario(topic.id);
  const savedTeachBack = user.teachBackResponses[topic.id];
  const savedScenario = user.scenarioResponses[topic.id];
  // Recall work is kept, so leaving the page and coming back does not wipe it.
  const savedRecall = useMemo(() => {
    const answers: Record<string, string> = {};
    const feedback: Record<string, { correct: boolean; message: string }> = {};
    for (const response of [...user.recallResponses]
      .filter((item) => item.topicId === topic.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      answers[response.questionId] = response.answer;
      const question = recallQuestions.find((item) => item.id === response.questionId);
      feedback[response.questionId] = { correct: response.correct, message: question?.explanation ?? "" };
    }
    return { answers, feedback };
  }, [user.recallResponses, topic.id, recallQuestions]);
  const [recallAnswers, setRecallAnswers] = useState<Record<string, string>>(savedRecall.answers);
  const [recallFeedback, setRecallFeedback] = useState<Record<string, { correct: boolean; message: string }>>(savedRecall.feedback);

  // Practice work is kept per question, so leaving the page does not wipe it.
  const savedPractice = useMemo(() => {
    const choices: Record<string, number> = {};
    const feedback: Record<string, string> = {};
    for (const response of [...user.practiceResponses]
      .filter((item) => item.topicId === topic.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      choices[response.activityId] = response.selectedIndex;
      const activity = practiceActivities.find((item) => item.id === response.activityId);
      feedback[response.activityId] = `${response.correct ? "Correct. " : "Not yet. "}${activity?.explanation ?? ""}`;
    }
    return { choices, feedback };
  }, [user.practiceResponses, topic.id, practiceActivities]);
  const [practiceChoices, setPracticeChoices] = useState<Record<string, number>>(savedPractice.choices);
  const [practiceFeedback, setPracticeFeedback] = useState<Record<string, string>>(savedPractice.feedback);
  const [teachBack, setTeachBack] = useState(savedTeachBack?.body ?? "");
  const [teachBackEditing, setTeachBackEditing] = useState(!savedTeachBack);
  const [scenarioAnswer, setScenarioAnswer] = useState(savedScenario?.response ?? "");
  const [scenarioFeedback, setScenarioFeedback] = useState<string | null>(savedScenario ? scenario?.guidance ?? null : null);
  const recallMarking = useAiMarking();
  const [markedRecallId, setMarkedRecallId] = useState<string | null>(null);
  /**
   * Which practice tab is open. Shortcuts elsewhere on the page can open a tab
   * directly by setting the address hash, for example #teach-back.
   */
  const [workTab, setWorkTab] = useState("recall");
  useEffect(() => {
    const tabs = ["recall", "practice", "teach-back", "scenario"];
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!tabs.includes(hash)) return;
      setWorkTab(hash);
      window.requestAnimationFrame(() => {
        document.getElementById("work-on-it")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);
  const teachBackMarking = useAiMarking();
  const scenarioMarking = useAiMarking();
  

  // Opening a topic is exposure evidence: it feeds retention, not mastery.
  useEffect(() => {
    const recent = user.learnerSignals.some(
      (signal) =>
        signal.kind === "lesson" &&
        signal.topicId === topic.id &&
        Date.now() - new Date(signal.at).getTime() < 6 * 60 * 60 * 1000,
    );
    if (!recent) actions.addLearnerSignal({ topicId: topic.id, kind: "lesson" });
    // Runs once per topic view; the recency guard prevents repeat rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  // Bring saved recall work back when the topic changes or a new answer is stored.
  // Only write when something actually differs, otherwise the saved objects are
  // rebuilt every render and the state updates loop.
  function mergeSaved<T>(current: Record<string, T>, saved: Record<string, T>): Record<string, T> {
    const merged = { ...saved, ...current };
    if (JSON.stringify(merged) === JSON.stringify(current)) return current;
    return merged;
  }


  useEffect(() => {
    setRecallAnswers((current) => mergeSaved(current, savedRecall.answers));
    setRecallFeedback((current) => mergeSaved(current, savedRecall.feedback));
  }, [savedRecall]);
  useEffect(() => { setRecallAnswers(savedRecall.answers); setRecallFeedback(savedRecall.feedback); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [topic.id]);

  useEffect(() => {
    setPracticeChoices((current) => mergeSaved(current, savedPractice.choices));
    setPracticeFeedback((current) => mergeSaved(current, savedPractice.feedback));
  }, [savedPractice]);
  useEffect(() => { setPracticeChoices(savedPractice.choices); setPracticeFeedback(savedPractice.feedback); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [topic.id]);


  useEffect(() => { setTeachBack(savedTeachBack?.body ?? ""); setTeachBackEditing(!savedTeachBack); }, [savedTeachBack, topic.id]);

  useEffect(() => { setScenarioAnswer(savedScenario?.response ?? ""); setScenarioFeedback(savedScenario ? scenario?.guidance ?? null : null); }, [savedScenario, scenario, topic.id]);
  

  const progress = user.topicProgress[topic.id] ?? {
    id: `progress-${topic.id}`, topicId: topic.id, status: "not_started" as const,
    understanding: 0, recall: 0, application: 0, practicalAbility: 0, troubleshooting: 0, retention: 0,
    updatedAt: new Date(0).toISOString(),
  };

  function raiseProgress(patch: Partial<TopicProgress>) {
    actions.setTopicProgress({ ...progress, ...patch, status: "in_progress", updatedAt: new Date().toISOString() });
  }

  async function submitRecall(questionId: string) {
    const question = recallQuestions.find((item) => item.id === questionId);
    const answer = recallAnswers[questionId]?.trim();
    if (!question || !answer) { toast.error("Write an answer before checking it."); return; }
    const matched = matchConcepts(answer, question.acceptedConcepts);
    setMarkedRecallId(questionId);
    // The AI examiner marks the meaning; the concept matcher is the offline fallback.
    const graded = await recallMarking.mark({
      topic: topic.title,
      task: "Recall question",
      question: question.prompt,
      answer,
      modelAnswer: question.explanation,
      expectedPoints: question.acceptedConcepts,
    });
    const correct = graded ? graded.correct : passesOffline(answer, question.acceptedConcepts, question.explanation);
    const hints = graded ? graded.hints : correct ? [] : offlineHints(answer, question.acceptedConcepts);
    // Nearly there means the thinking holds up with a step missing, so it is a nudge, not a mistake.
    const almost = !correct && (graded ? graded.status === "almost" : hints.length > 0);
    const now = new Date().toISOString();
    actions.addRecallResponse({ id: crypto.randomUUID(), questionId, topicId: topic.id, answer, correct, matchedConcepts: matched, createdAt: now });
    if (!correct && !almost) {
      actions.recordMistake({
        topicId: topic.id,
        activity: "recall",
        category: matched.length === 0 ? "didnt_know_fact" : "misunderstood_concept",
        severity: matched.length === 0 ? "high" : "medium",
        questionId,
        createdAt: now,
      });
      actions.ensureReview({ topicId: topic.id });
    } else {
      // Answered it well, so any review waiting on this topic is settled.
      actions.settleTopicReview(topic.id, "pass");
    }
    const message = almost
      ? `Nearly there. ${hints.length ? hints.join(". ") + "." : question.explanation}`
      : question.explanation;
    setRecallFeedback((current) => ({ ...current, [questionId]: { correct, message } }));
    raiseProgress({ recall: Math.max(progress.recall, correct ? 35 : almost ? 25 : 10), retention: Math.max(progress.retention, correct ? 15 : 5) });

  }

  function submitPractice(activityId: string) {
    const activity = practiceActivities.find((item) => item.id === activityId);
    const choice = practiceChoices[activityId];
    if (!activity || choice === undefined) { toast.error("Choose an answer first."); return; }
    const correct = choice === activity.answerIndex;
    actions.addPracticeResponse({ id: crypto.randomUUID(), activityId: activity.id, topicId: topic.id, selectedIndex: choice, correct, createdAt: new Date().toISOString() });
    setPracticeFeedback((current) => ({ ...current, [activity.id]: `${correct ? "Correct. " : "Not yet. "}${activity.explanation}` }));
    if (correct) actions.settleTopicReview(topic.id, "pass");
    raiseProgress({ application: Math.max(progress.application, correct ? 35 : 10), practicalAbility: Math.max(progress.practicalAbility, correct ? 25 : 10) });
  }


  async function saveTeachBack() {
    const body = teachBack.trim();
    if (!body) { toast.error("Write your explanation before saving."); return; }
    const now = new Date().toISOString();
    actions.setTeachBackResponse({ id: savedTeachBack?.id ?? crypto.randomUUID(), topicId: topic.id, body, createdAt: savedTeachBack?.createdAt ?? now, updatedAt: now });
    setTeachBackEditing(false); toast.success("Teach back saved. GAYL is reading your explanation.");
    const graded = await teachBackMarking.mark({
      topic: topic.title,
      task: "Teach back: the learner explains the topic in their own words",
      question: `Explain ${topic.title} in your own words, as if teaching someone new to IT.`,
      answer: body,
      modelAnswer: `${lesson?.definition ?? ""} ${lesson?.whyItMatters ?? ""}`.trim() || topic.summary,
      expectedPoints: topic.learningObjectives,
    });
    // Understanding rises with the quality of the explanation, never just for saving it.
    const understanding = graded ? Math.max(25, Math.round(graded.score * 0.8)) : 25;
    raiseProgress({ understanding: Math.max(progress.understanding, understanding), retention: Math.max(progress.retention, graded?.correct ? 25 : 10) });
  }

  async function submitScenario() {
    if (!scenario || !scenarioAnswer.trim()) { toast.error("Explain your decision first."); return; }
    const matched = matchConcepts(scenarioAnswer, scenario.expectedConcepts);
    const graded = await scenarioMarking.mark({
      topic: topic.title,
      task: "Real-world scenario decision and reasoning",
      question: `${scenario.situation}\n\n${scenario.decisionPrompt}`,
      answer: scenarioAnswer.trim(),
      modelAnswer: scenario.guidance,
      expectedPoints: scenario.expectedConcepts,
    });
    const meetsCriteria = graded ? graded.correct : passesOffline(scenarioAnswer.trim(), scenario.expectedConcepts, scenario.guidance);
    const now = new Date().toISOString();
    actions.setScenarioResponse({ id: savedScenario?.id ?? crypto.randomUUID(), scenarioId: scenario.id, topicId: topic.id, response: scenarioAnswer.trim(), matchedConcepts: matched, meetsCriteria, createdAt: savedScenario?.createdAt ?? now, updatedAt: now });
    setScenarioFeedback(`${meetsCriteria ? "Your reasoning includes key evidence. " : "Strengthen your reasoning. "}${scenario.guidance}`);
    raiseProgress({ application: Math.max(progress.application, meetsCriteria ? 50 : 20), troubleshooting: Math.max(progress.troubleshooting, meetsCriteria ? 40 : 15), practicalAbility: Math.max(progress.practicalAbility, meetsCriteria ? 35 : 15) });
  }


  const sectionMeasures = useMemo(() => topicMeasures(user, topic.id), [user, topic.id]);
  if (!lesson || !module || !practice || !scenario) return null;
  const keywords = [
    ...lesson.keyTerms.map(({ term, meaning }) => ({ term, meaning })),
    ...(deepLesson?.plain?.wordList.map(({ term, plain }) => ({ term, meaning: plain })) ?? []),
  ].filter(
    (entry, index, entries) =>
      entries.findIndex((candidate) => candidate.term.trim().toLowerCase() === entry.term.trim().toLowerCase()) === index,
  );

  return <div className="space-y-4">
    <Panel title="Learning objectives">
      <ul className="space-y-3">{topic.learningObjectives.map((objective) => <li key={objective} className="flex gap-3 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><span>{objective}</span></li>)}</ul>
    </Panel>

    <MasteryChecklist topicId={topic.id} />

    <div id="lesson-reading" className="scroll-mt-24 space-y-4">{deepLesson ? <DeepLessonReading lesson={deepLesson} /> : null}{deepLesson?.depth ? <LessonDepthReading depth={deepLesson.depth} /> : null}<Panel title={deepLesson ? "Quick reference" : lesson.title} description={deepLesson ? "A condensed summary of the lesson above, for revision." : lesson.body}><div className="space-y-7 text-sm leading-7 text-muted-foreground">
        <ContentSection title="What It Is" text={lesson.definition} /><ContentSection title="Why It Matters" text={lesson.whyItMatters} />
        <ListSection title="How It Works" items={module.howItWorks} /><ListSection title="Where You See It" items={module.whereYouSeeIt} />
        <section><h2 className="mb-3 text-base font-semibold text-foreground">Keywords</h2><dl className="divide-y divide-border border-y border-border">{keywords.map((item) => <div key={item.term} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="font-medium text-foreground">{item.term}</dt><dd>{item.meaning}</dd></div>)}</dl></section>
        <ListSection title="Examples" items={lesson.realWorldExamples} /><ListSection title="Common Problems" items={module.commonProblems} /><ListSection title="How It Fails" items={module.howItFails} /><ListSection title="How to Troubleshoot" items={module.troubleshooting} ordered /><ListSection title="Practical Knowledge" items={module.practicalKnowledge} /><ListSection title="Exam Coverage" items={module.examCoverage} /><ListSection title="Interview Questions" items={module.interviewQuestions} />
        <ContentReportButton kind="lesson" refId={topic.id} label={topic.title} />
      </div></Panel><div id="worked-examples" className="scroll-mt-24"><WorkedExamples examples={getWorkedExamples(topic.id)} /></div><MediaPanel topic={topic} /></div>

    <section id="work-on-it" className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Work on it</h2>
        <p className="text-sm text-muted-foreground">Read the lesson first, then check yourself here. Your answers are saved as you go.</p>
      </div>
      <Tabs value={workTab} onValueChange={setWorkTab} className="space-y-4">
      <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
        <TabsTrigger value="recall">Recall</TabsTrigger><TabsTrigger value="practice">Practice</TabsTrigger><TabsTrigger value="teach-back">Teach Back</TabsTrigger><TabsTrigger value="scenario">Real-World Scenario</TabsTrigger>
      </TabsList>
      <TabsContent value="recall"><div className="space-y-4">{visibleRecall.map((question, index) => {
        const feedback = recallFeedback[question.id];
        return <Panel key={question.id} title={`Recall ${index + 1}`} description={question.prompt}><Label htmlFor={question.id}>Your answer</Label><Textarea id={question.id} className="mt-2" rows={4} value={recallAnswers[question.id] ?? ""} onChange={(event) => setRecallAnswers((current) => ({ ...current, [question.id]: event.target.value }))} /><Button className="mt-3" disabled={recallMarking.busy} onClick={() => void submitRecall(question.id)}>{recallMarking.busy && markedRecallId === question.id ? "Marking…" : "Check answer"}</Button>{feedback ? <p role="status" className={`mt-3 text-sm ${feedback.correct ? "text-primary" : "text-amber-400"}`}>{feedback.correct ? "Correct. " : feedback.message.startsWith("Nearly there") ? "" : "Here is where I would go next. "}{feedback.message}</p> : null}{markedRecallId === question.id ? <AiFeedback state={recallMarking} /> : null}</Panel>;
      })}</div></TabsContent>
      <TabsContent value="practice"><div className="space-y-4">{practiceActivities.map((activity, index) => {
        const chosen = practiceChoices[activity.id];
        const feedback = practiceFeedback[activity.id];
        return <Panel key={activity.id} title={`Practice ${index + 1}: ${activity.title}`} description={activity.prompt}><div className="grid gap-2">{activity.choices.map((choice, choiceIndex) => <Button key={choice} variant={chosen === choiceIndex ? "secondary" : "outline"} className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => setPracticeChoices((current) => ({ ...current, [activity.id]: choiceIndex }))}>{choice}</Button>)}</div><Button className="mt-4" onClick={() => submitPractice(activity.id)}>Check decision</Button>{feedback ? <p role="status" className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}</Panel>;
      })}</div></TabsContent>

      <TabsContent value="teach-back"><Panel title="Teach Back" description="Explain this topic in your own words. GAYL reads it back and tells you what your explanation shows.">{teachBackEditing ? <><Label htmlFor="teach-back">Your explanation</Label><Textarea id="teach-back" className="mt-2" rows={7} value={teachBack} onChange={(event) => setTeachBack(event.target.value)} /><div className="mt-3 flex flex-wrap gap-2"><Button disabled={teachBackMarking.busy} onClick={() => void saveTeachBack()}><Save />{teachBackMarking.busy ? "GAYL is reading…" : "Save"}</Button>{savedTeachBack ? <Button variant="outline" onClick={() => { setTeachBack(savedTeachBack.body); setTeachBackEditing(false); }}><FileText />Review saved response</Button> : null}</div></> : <><div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">{savedTeachBack?.body}</div><Button className="mt-3" variant="outline" onClick={() => setTeachBackEditing(true)}><Edit3 />Edit</Button></>}<AiFeedback state={teachBackMarking} /></Panel></TabsContent>
      <TabsContent value="scenario"><Panel title={scenario.title} description={scenario.situation}><p className="mb-4 text-sm font-medium">{scenario.decisionPrompt}</p><Label htmlFor="scenario-answer">Your decision and reasoning</Label><Textarea id="scenario-answer" className="mt-2" rows={6} value={scenarioAnswer} onChange={(event) => setScenarioAnswer(event.target.value)} /><Button className="mt-3" disabled={scenarioMarking.busy} onClick={() => void submitScenario()}>{scenarioMarking.busy ? "GAYL is reading…" : "Evaluate reasoning"}</Button>{scenarioFeedback ? <p role="status" className="mt-3 text-sm text-muted-foreground">{scenarioFeedback}</p> : null}<AiFeedback state={scenarioMarking} /></Panel></TabsContent>
      </Tabs>
    </section>

    <div className="grid gap-4 lg:grid-cols-2">
      <AnnotationPanel
        target={{ kind: "lesson", id: lesson.id, label: topic.title, href: `/topics/${topic.id}` }}
        title="Lesson notes and bookmark"
        description="Notes and bookmarks for this lesson, saved with everything else you have marked."
      />
      <Panel
        title="Where you stand in this section"
        description="How much of this section you have done, and how the final section quiz went."
      >
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>Learning progress</span>
              <span className="tabular-nums text-muted-foreground">{sectionMeasures.learningProgress}%</span>
            </div>
            <Progress value={sectionMeasures.learningProgress} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {sectionMeasures.activitiesCompleted} of {sectionMeasures.activitiesTotal} activities done
            </p>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>Overall mastery</span>
              <span className="tabular-nums text-muted-foreground">{sectionMeasures.overallMastery}%</span>
            </div>
            <Progress value={sectionMeasures.overallMastery} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {sectionMeasures.assessmentsTaken > 0
                ? "Your best result on the final section quiz."
                : "Take the final section quiz to set this."}
            </p>
          </div>
        </div>
      </Panel>
    </div>
  </div>;
}

function ContentSection({ title, text }: { title: string; text: string }) { return <section><h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2><p>{text}</p></section>; }
function ListSection({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return <section><h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2><Tag className={ordered ? "list-decimal space-y-2 pl-5" : "space-y-2"}>{items.map((item) => <li key={item} className={ordered ? "pl-1" : "flex gap-3"}>{ordered ? item : <><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" /><span>{item}</span></>}</li>)}</Tag></section>;
}

const kindLabels: Record<Resource["kind"], string> = { course: "Course", article: "Article", docs: "Documentation", "learning-path": "Learning path", video: "Video" };

function MediaPanel({ topic }: { topic: Topic }) {
  const media = useMemo(() => {
    const direct = resources.filter((resource) => resource.topicIds.includes(topic.id));
    const related = resources.filter(
      (resource) => !direct.includes(resource) && resource.certificationId === topic.certificationId,
    );
    return [...direct, ...related.slice(0, Math.max(0, 4 - direct.length))];
  }, [topic.id, topic.certificationId]);

  const videos = media.filter((resource) => resource.kind === "video");
  const reading = media.filter((resource) => resource.kind !== "video");
  if (media.length === 0) return null;

  return (
    <Panel title="Watch and read" description="Verified official and reputable sources for this topic. Links open in a new tab.">
      <div className="space-y-6">
        {videos.length > 0 ? <MediaGroup title="Video training" items={videos} video /> : null}
        {reading.length > 0 ? <MediaGroup title="Reading and courses" items={reading} /> : null}
      </div>
    </Panel>
  );
}

function MediaGroup({ title, items, video = false }: { title: string; items: Resource[]; video?: boolean }) {
  const Icon = video ? PlayCircle : FileText;
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-foreground">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((resource) => (
          <li key={resource.id} className="rounded-lg border border-border bg-secondary/20 p-4">
            <div className="flex items-start gap-3">
              <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-foreground">{resource.title}</p>
                <p className="text-xs text-muted-foreground">{resource.provider}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{kindLabels[resource.kind]}</Badge>
                  <Badge variant="outline">{resource.access === "free" ? "Free" : "Paid"}</Badge>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={resource.url} target="_blank" rel="noreferrer">
                    {video ? "Watch" : "Open"}
                    <ExternalLink aria-hidden />
                  </a>
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
