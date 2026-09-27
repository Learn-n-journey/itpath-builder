import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, CheckCircle2, Edit3, ExternalLink, Eye, FileText, PlayCircle, Save, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";



import { HelpTip } from "@/components/help-tip";
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
import { lessons, resources, type Topic } from "@/data/static-content";
import { getWorkedExamples } from "@/data/worked-examples";
import { getDeepLesson } from "@/data/deep-lessons";
import { getGeneratedRecallQuestions } from "@/data/recall-generator";
import { DeepLessonReading } from "@/components/learning/deep-lesson-reading";
import {
  LessonCheckYourself,
  LessonKeyIdeas,
  LessonMisconceptions,
  LessonReferencePanel,
  LessonWalkthroughPanel,
} from "@/components/learning/lesson-depth-reading";
import { WorkedExamples } from "@/components/learning/worked-examples";
import { getLearningModule, getPracticeActivities, getRealWorldScenario, getRecallQuestions } from "@/data/learning-content";
import type { TopicProgress, Resource } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";
import { topicMeasures } from "@/lib/mastery-summary";
import { answerMatches, coveredConcepts } from "@/lib/fuzzy-match";
import { ContentReportButton } from "@/components/content-report-button";
import { LessonSources } from "@/components/learning/lesson-sources";
import {
  ownerKeyTermsFor,
  ownerLessonSourcesFor,
  ownerRecallFor,
  ownerTeachBackFor,
} from "@/lib/owner-lesson-store";
import { ownerWorkRecallFor, ownerWorkTeachBackFor } from "@/lib/owner-work-store";
import { useOwnerContentVersion } from "@/hooks/use-owner-content";
import { ObdPracticePanel } from "@/components/auto/obd-practice-panel";
import { TopicKnowledgePanel } from "@/components/knowledge/topic-knowledge-panel";
import { ReturnToActivity, ReviewConceptLink } from "@/components/learning/remediation-link";
import { lessonConceptAnchor, lessonSectionId, resolveLessonSection } from "@/lib/lesson-concepts";
import { learningExperienceLanguage } from "@/domain/experience";


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

function offlineHints(answer: string, concepts: string[]): string[] {
  const matched = new Set(matchConcepts(answer, concepts));
  if (matched.size === 0) return [];
  return concepts
    .filter((concept) => !matched.has(concept))
    .slice(0, 4)
    .map((concept) => `Add the step about ${concept.charAt(0).toLowerCase()}${concept.slice(1)}`);
}





export function TopicLearningExperience({ topic, view = "learning" }: { topic: Topic; view?: "learning" | "resources" | "notes" }) {
  const { user, actions } = useAppState();
  const experience = learningExperienceLanguage();
  const lesson = lessons.find((item) => item.topicId === topic.id);
  const module = getLearningModule(topic.id);
  const deepLesson = getDeepLesson(topic.id);
  const ownerVersion = useOwnerContentVersion();
  const recallQuestions = useMemo(() => {
    const work = ownerWorkRecallFor(topic.id);
    if (work.length) return work;
    const owned = ownerRecallFor(topic.id);
    if (owned.length) return owned;
    return [...getRecallQuestions(topic.id), ...getGeneratedRecallQuestions(topic.id)];
    // Owner content versions intentionally refresh workbook-backed questions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id, ownerVersion]);
  // Recall shown two at a time, required questions first, in a stable order for this visit.
  const [recallPage, setRecallPage] = useState(0);
  const recallOrder = useRef<{ topicId: string; ids: string[] } | null>(null);
  const recallPool = useMemo(() => {
    if (recallOrder.current?.topicId !== topic.id) {
      const answeredWell = new Set(
        user.recallResponses.filter((item) => item.topicId === topic.id && item.correct).map((item) => item.questionId),
      );
      const required = getRecallQuestions(topic.id);
      const requiredIds = new Set(required.map((item) => item.id));
      const extra = recallQuestions.filter((item) => !requiredIds.has(item.id));
      const allRequiredDone = required.every((item) => answeredWell.has(item.id));
      const ordered = required.length === 0 || allRequiredDone
        ? [...recallQuestions.filter((item) => !answeredWell.has(item.id)), ...recallQuestions.filter((item) => answeredWell.has(item.id))]
        : [...required.filter((item) => !answeredWell.has(item.id)), ...required.filter((item) => answeredWell.has(item.id)), ...extra];
      recallOrder.current = { topicId: topic.id, ids: ordered.map((item) => item.id) };
    }
    return recallOrder.current.ids
      .map((id) => recallQuestions.find((item) => item.id === id))
      .filter((item): item is (typeof recallQuestions)[number] => Boolean(item));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recallQuestions, topic.id]);
  const recallPageCount = Math.max(1, Math.ceil(recallPool.length / 2));
  const safeRecallPage = Math.min(recallPage, recallPageCount - 1);
  const visibleRecall = recallPool.slice(safeRecallPage * 2, safeRecallPage * 2 + 2);

  const practiceActivities = getPracticeActivities(topic.id);
  const practice = practiceActivities[0];
  const scenario = getRealWorldScenario(topic.id);
  const ownerTeachBack = ownerWorkTeachBackFor(topic.id) ?? ownerTeachBackFor(topic.id);
  const savedTeachBack = user.teachBackResponses[topic.id];
  const savedScenario = user.scenarioResponses[topic.id];
  const savedRecall = useMemo(() => {
    const answers: Record<string, string> = {};
    const feedback: Record<string, { correct: boolean; message: string }> = {};
    for (const response of [...user.recallResponses]
      .filter((item) => item.topicId === topic.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      answers[response.questionId] = response.answer;
      feedback[response.questionId] = {
        correct: response.correct,
        message: recallQuestions.find((item) => item.id === response.questionId)?.explanation ?? "",
      };
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
  /**
   * Which practice tab is open. Shortcuts elsewhere on the page can open a tab
   * directly by setting the address hash, for example #teach-back.
   */
  const [proveTab, setProveTab] = useState(visibleRecall.length > 0 ? "recall" : "teach-back");
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash === "recall") setProveTab("recall");
      else if (["teach-back", "scenario"].includes(hash)) setProveTab(hash);
      else if (hash !== "practice") return;
      window.requestAnimationFrame(() => {
        document.getElementById(hash === "practice" ? "try-it" : "prove-it")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };
    applyHash();
    const onClickHash = () => window.setTimeout(applyHash, 0);
    window.addEventListener("hashchange", applyHash);
    window.addEventListener("itpath:hash", onClickHash);
    return () => { window.removeEventListener("hashchange", applyHash); window.removeEventListener("itpath:hash", onClickHash); };
  }, []);
  const recallMarking = useAiMarking();
  const [markedRecallId, setMarkedRecallId] = useState<string | null>(null);
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
    const almost = !correct && (graded ? graded.status === "almost" : hints.length > 0);
    const now = new Date().toISOString();
    actions.addRecallResponse({ id: crypto.randomUUID(), questionId, topicId: topic.id, answer, correct, matchedConcepts: matched, createdAt: now });
    if (!correct && !almost) {
      actions.recordMistake({ topicId: topic.id, activity: "recall", category: matched.length === 0 ? "didnt_know_fact" : "misunderstood_concept", severity: matched.length === 0 ? "high" : "medium", questionId, createdAt: now });
      actions.ensureReview({ topicId: topic.id });
    } else actions.settleTopicReview(topic.id, "pass");
    const message = almost ? `Nearly there. ${hints.length ? `${hints.join(". ")}.` : question.explanation}` : question.explanation;
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
    if (correct) {
      actions.settleTopicReview(topic.id, "pass");
      user.mistakes.filter((mistake) => !mistake.resolved && mistake.questionId === activity.id).forEach((mistake) => actions.setMistakeResolved(mistake.id, true));
    } else {
      actions.recordMistake({ topicId: topic.id, activity: "practice", category: "misunderstood_concept", severity: "medium", questionId: activity.id, createdAt: new Date().toISOString() });
      actions.ensureReview({ topicId: topic.id });
    }
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
      question: ownerTeachBack?.prompt || `Explain ${topic.title} in your own words, as if teaching someone new to IT.`,
      answer: body,
      modelAnswer: `${lesson?.definition ?? ""} ${lesson?.whyItMatters ?? ""}`.trim() || topic.summary,
      expectedPoints: ownerTeachBack?.expectedPoints.length
        ? ownerTeachBack.expectedPoints
        : topic.learningObjectives,
    }, topic.id);
    if (!graded) {
      const expected = ownerTeachBack?.expectedPoints.length ? ownerTeachBack.expectedPoints : topic.learningObjectives;
      const ok = passesOffline(body, expected, `${lesson?.definition ?? ""} ${lesson?.whyItMatters ?? ""}`.trim() || topic.summary);
      actions.addLearnerSignal({ topicId: topic.id, kind: "ai_grading", correct: ok, score: ok ? 1 : 0.4 });
    }
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
    if (meetsCriteria) {
      actions.settleTopicReview(topic.id, "pass");
      user.mistakes.filter((mistake) => !mistake.resolved && mistake.questionId === scenario.id).forEach((mistake) => actions.setMistakeResolved(mistake.id, true));
    } else {
      actions.recordMistake({ topicId: topic.id, activity: "practice", category: matched.length === 0 ? "didnt_know_fact" : "misunderstood_concept", severity: "medium", questionId: scenario.id, createdAt: now });
      actions.ensureReview({ topicId: topic.id });
    }
    raiseProgress({ application: Math.max(progress.application, meetsCriteria ? 50 : 20), troubleshooting: Math.max(progress.troubleshooting, meetsCriteria ? 40 : 15), practicalAbility: Math.max(progress.practicalAbility, meetsCriteria ? 35 : 15) });
  }


  const sectionMeasures = useMemo(() => topicMeasures(user, topic.id), [user, topic.id]);
  // A subject may not carry practice decisions or real-world scenarios for
  // every section; those parts simply do not appear, the lesson still does.
  if (!lesson || !module) return null;
  const ownTerms = ownerKeyTermsFor(topic.id);
  const keywords = [
    ...(ownTerms.length ? ownTerms : lesson.keyTerms.map(({ term, meaning }) => ({ term, meaning }))),
    ...(deepLesson?.plain?.wordList.map(({ term, plain }) => ({ term, meaning: plain })) ?? []),
  ].filter(
    (entry, index, entries) =>
      entries.findIndex((candidate) => candidate.term.trim().toLowerCase() === entry.term.trim().toLowerCase()) === index,
  );
  // Exam coverage and exam traps are one list: what the exam tests, and how it tries to catch you out.
  const examCoverage = [...module.examCoverage, ...(deepLesson?.depth?.examTraps ?? [])].filter(
    (item, index, items) => items.findIndex((candidate) => candidate.trim().toLowerCase() === item.trim().toLowerCase()) === index,
  );

  const topicMedia = mediaFor(topic);
  const mediaVideos = topicMedia.filter((resource) => resource.kind === "video");
  const mediaReading = topicMedia.filter((resource) => resource.kind !== "video");
  const extraStages = (mediaReading.length > 0 ? 1 : 0) + 1;
  const stageNo = (base: number) => String(base + extraStages).padStart(2, "0");

  if (view === "resources") {
    return (
      <div className="space-y-4">
        {mediaReading.length > 0 ? <MediaGroup title="Reading and courses" items={mediaReading} /> : null}
        {mediaVideos.length > 0 ? <MediaGroup title="Video training" items={mediaVideos} video /> : null}
        <LessonSources resources={[...resources, ...ownerLessonSourcesFor(topic.id)]} topicId={topic.id} />
      </div>
    );
  }

  if (view === "notes") {
    return (
      <AnnotationPanel
        target={{ kind: "lesson", id: lesson.id, label: topic.title, href: `/topics/${topic.id}` }}
        title="Lesson notes and bookmark"
        description=""
      />
    );
  }
  return <div className="space-y-4">
    <ReturnToActivity topicId={topic.id} />
    <Panel title="Learning objectives">
      <ul className="space-y-3">{topic.learningObjectives.map((objective) => <li key={objective} className="flex gap-3 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><span>{objective}</span></li>)}</ul>
    </Panel>

    <section id="read-it" className="scroll-mt-24">
      <div id="lesson-reading" className="space-y-4">
        {deepLesson ? <DeepLessonReading lesson={deepLesson} difficulty={topic.difficulty} /> : null}
        {deepLesson?.depth ? <div id={lessonConceptAnchor(lessonSectionId(topic.id, "key-ideas"))} className="scroll-mt-24"><LessonKeyIdeas depth={deepLesson.depth} /></div> : null}
        <div id={lessonConceptAnchor(lessonSectionId(topic.id, "core"))} className="scroll-mt-24"><Panel title={deepLesson ? "Core lesson summary" : lesson.title}>
          <div className="space-y-7 text-sm leading-7 text-muted-foreground">
            <ContentSection title="What It Is" text={deepLesson?.intro || lesson.definition} />
            <ContentSection title="Why It Matters" text={lesson.whyItMatters} />
            <div id={lessonConceptAnchor(lessonSectionId(topic.id, "where-you-see-it"))} className="scroll-mt-24"><ListSection title="Where You See It" items={deepLesson?.whereYouMeetIt ? [deepLesson.whereYouMeetIt] : module.whereYouSeeIt} /></div>
            <div id={lessonConceptAnchor(lessonSectionId(topic.id, "how-it-works"))} className="scroll-mt-24"><ListSection title="How It Works" items={module.howItWorks} /></div>
            <div id={lessonConceptAnchor(lessonSectionId(topic.id, "practical-knowledge"))} className="scroll-mt-24"><ListSection title="Practical Knowledge" items={module.practicalKnowledge} /></div>
          </div>
        </Panel></div>
      </div>
    </section>

    <LearningStage id="see-it" number="02" title={experience.see} icon={<Eye />}>
      <div id="worked-examples" className="scroll-mt-24 space-y-4">
        <WorkedExamples examples={getWorkedExamples(topic.id)} />
        {deepLesson?.depth ? <div id={lessonConceptAnchor(lessonSectionId(topic.id, "walkthrough"))} className="scroll-mt-24"><LessonWalkthroughPanel depth={deepLesson.depth} /></div> : null}
        {deepLesson?.depth ? <div id={lessonConceptAnchor(lessonSectionId(topic.id, "misconceptions"))} className="scroll-mt-24"><LessonMisconceptions depth={deepLesson.depth} /></div> : null}
        <Panel title="Apply the pattern">
          <div className="space-y-7 text-sm leading-7 text-muted-foreground">
            <ListSection title="Examples" items={lesson.realWorldExamples} />
            <div id={lessonConceptAnchor(lessonSectionId(topic.id, "problems"))} className="scroll-mt-24"><ListSection title="What goes wrong" items={[...module.commonProblems, ...module.howItFails]} /></div>
            <div id={lessonConceptAnchor(lessonSectionId(topic.id, "troubleshooting"))} className="scroll-mt-24"><ListSection title="How to Troubleshoot" items={module.troubleshooting} ordered /></div>
            <div id={lessonConceptAnchor(lessonSectionId(topic.id, "exam-coverage"))} className="scroll-mt-24"><ListSection title="Exam Coverage" items={examCoverage} /></div>
          </div>
        </Panel>
      </div>
    </LearningStage>

    {mediaReading.length > 0 ? <LearningStage id="read-more" number="03" title="Read It" icon={<FileText />}>
      <MediaGroup title="Reading and courses" items={mediaReading} />
    </LearningStage> : null}

    <LearningStage id="watch-it" number={mediaReading.length > 0 ? "04" : "03"} title="Watch It" icon={<PlayCircle />}>
      {mediaVideos.length > 0
        ? <MediaGroup title="Video training" items={mediaVideos} video />
        : <Panel title="Video training" description="Video resources for this topic will appear here when they are available." descriptionVisibility="visible" />}
    </LearningStage>

    <LearningStage id="practice-it" number={stageNo(3)} title={experience.practice} icon={<Wrench />} tone="practice">
      <div id="try-it" className="scroll-mt-24 space-y-4">
      {deepLesson?.depth ? <LessonCheckYourself depth={deepLesson.depth} topicId={topic.id} /> : null}
        {practice ? <div id="practice" className="scroll-mt-24 space-y-4">{practiceActivities.map((activity, index) => {
          const chosen = practiceChoices[activity.id]; const feedback = practiceFeedback[activity.id];
          const incorrect = feedback?.startsWith("Not yet.") ?? false;
          const sectionId = activity.lessonSectionId ?? (activity.id.includes("owner") ? undefined : lessonSectionId(topic.id, "core"));
          const mapped = resolveLessonSection(topic.id, sectionId, deepLesson);
          return <Panel key={activity.id} title={`Practice ${index + 1}: ${activity.title}`} description={activity.prompt} descriptionVisibility="visible"><div className="grid gap-2">{activity.choices.map((choice, choiceIndex) => <Button key={choice} variant={chosen === choiceIndex ? "secondary" : "outline"} className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => setPracticeChoices((current) => ({ ...current, [activity.id]: choiceIndex }))}>{choice}</Button>)}</div><Button className="mt-4" onClick={() => submitPractice(activity.id)}>Check decision</Button>{feedback ? <p role="status" className="mt-3 text-sm text-muted-foreground">{feedback}</p> : null}{incorrect && mapped && sectionId ? <ReviewConceptLink topicId={topic.id} conceptId={activity.conceptId ?? `${topic.id}:practice:${activity.id}`} sectionId={sectionId} anchor={mapped.anchor} sourceKind="practice" sourceItemId={activity.id} /> : null}</Panel>;
        })}</div> : null}
      <ObdPracticePanel topicId={topic.id} topicTitle={topic.title} />
      </div>
    </LearningStage>

    <LearningStage id="prove-it" number={stageNo(4)} title={experience.prove} help="Every activity here counts. Score 80% or better on all of them to open the next section." icon={<ShieldCheck />} tone="proof">
      <Tabs value={proveTab} onValueChange={setProveTab} className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">{visibleRecall.length > 0 ? <TabsTrigger value="recall">{experience.recall}</TabsTrigger> : null}<TabsTrigger value="teach-back">{experience.teachBack}</TabsTrigger>{scenario ? <TabsTrigger value="scenario">{experience.scenario}</TabsTrigger> : null}</TabsList>
        {visibleRecall.length > 0 ? <TabsContent value="recall"><div id="recall" className="scroll-mt-24 space-y-4">{visibleRecall.map((question, index) => {
          const feedback = recallFeedback[question.id];
          const sectionId = question.lessonSectionId ?? (question.id.includes("owner") || question.id.includes("work") ? undefined : lessonSectionId(topic.id, "core"));
          const mapped = resolveLessonSection(topic.id, sectionId, deepLesson);
          return <Panel key={question.id} title={`Recall ${safeRecallPage * 2 + index + 1}`} description={question.prompt} descriptionVisibility="visible"><Label htmlFor={`recall-${question.id}`}>{experience.recallPrompt}</Label><Textarea id={`recall-${question.id}`} className="mt-2" rows={5} value={recallAnswers[question.id] ?? ""} onChange={(event) => setRecallAnswers((current) => ({ ...current, [question.id]: event.target.value }))} /><Button className="mt-3" disabled={recallMarking.busy && markedRecallId === question.id} onClick={() => void submitRecall(question.id)}>{recallMarking.busy && markedRecallId === question.id ? "GAYL is reading…" : "Check recall"}</Button>{feedback ? <p role="status" className={`mt-3 text-sm ${feedback.correct ? "text-success" : "text-muted-foreground"}`}>{feedback.correct ? "Correct. " : "Keep building it. "}{feedback.message}</p> : null}{feedback && !feedback.correct && mapped && sectionId ? <ReviewConceptLink topicId={topic.id} conceptId={question.conceptId ?? `${topic.id}:recall:${question.id}`} sectionId={sectionId} anchor={mapped.anchor} sourceKind="recall" sourceItemId={question.id} /> : null}{markedRecallId === question.id ? <AiFeedback state={recallMarking} /> : null}</Panel>;
        })}{recallPageCount > 1 ? <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="outline" disabled={safeRecallPage === 0} onClick={() => setRecallPage(safeRecallPage - 1)}>Previous 2</Button><span className="text-sm text-muted-foreground">{safeRecallPage * 2 + 1}–{Math.min(recallPool.length, safeRecallPage * 2 + 2)} of {recallPool.length}</span><Button variant="outline" disabled={safeRecallPage >= recallPageCount - 1} onClick={() => { setRecallPage(safeRecallPage + 1); document.getElementById("recall")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Next 2</Button></div> : null}</div></TabsContent> : null}
        <TabsContent value="teach-back"><div id="teach-back" className="scroll-mt-24"><Panel title="Teach Back" description={ownerTeachBack?.prompt || "Explain this topic in your own words. GAYL reads it back and tells you what your explanation shows."} descriptionVisibility="visible">{teachBackEditing ? <><Label htmlFor="teach-back-answer">Your explanation</Label><Textarea id="teach-back-answer" className="mt-2" rows={7} value={teachBack} onChange={(event) => setTeachBack(event.target.value)} /><div className="mt-3 flex flex-wrap gap-2"><Button disabled={teachBackMarking.busy} onClick={() => void saveTeachBack()}><Save />{teachBackMarking.busy ? "GAYL is reading…" : "Save"}</Button>{savedTeachBack ? <Button variant="outline" onClick={() => { setTeachBack(savedTeachBack.body); setTeachBackEditing(false); }}><FileText />Review saved response</Button> : null}</div></> : <><div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">{savedTeachBack?.body}</div><Button className="mt-3" variant="outline" onClick={() => setTeachBackEditing(true)}><Edit3 />Edit</Button></>}<AiFeedback state={teachBackMarking} /></Panel></div></TabsContent>
        {scenario ? <TabsContent value="scenario"><div id="scenario" className="scroll-mt-24"><Panel title={scenario.title} description={scenario.situation} descriptionVisibility="visible"><p className="mb-4 text-sm font-medium">{scenario.decisionPrompt}</p><Label htmlFor="scenario-answer">{experience.scenarioAnswer}</Label><Textarea id="scenario-answer" className="mt-2" rows={6} value={scenarioAnswer} onChange={(event) => setScenarioAnswer(event.target.value)} /><Button className="mt-3" disabled={scenarioMarking.busy} onClick={() => void submitScenario()}>{scenarioMarking.busy ? "GAYL is reading…" : experience.scenarioAction}</Button>{scenarioFeedback ? <p role="status" className="mt-3 text-sm text-muted-foreground">{scenarioFeedback}</p> : null}{savedScenario && !savedScenario.meetsCriteria && (() => { const sectionId = scenario.lessonSectionId ?? (scenario.id.includes("owner") || scenario.id.includes("work") ? undefined : lessonSectionId(topic.id, "troubleshooting")); const mapped = resolveLessonSection(topic.id, sectionId, deepLesson); return mapped && sectionId ? <ReviewConceptLink topicId={topic.id} conceptId={scenario.conceptId ?? `${topic.id}:scenario:${scenario.id}`} sectionId={sectionId} anchor={mapped.anchor} sourceKind="scenario" sourceItemId={scenario.id} /> : null; })()}<AiFeedback state={scenarioMarking} /></Panel></div></TabsContent> : null}
      </Tabs>
      <MasteryChecklist topicId={topic.id} />
      <div id="section-quiz" className="scroll-mt-24"><Panel title={experience.quiz} help="The quiz has 20 questions. Score 80% or better to pass."><Button asChild><Link to="/section-quiz/$topicId" params={{ topicId: topic.id }}>{experience.quizAction}</Link></Button></Panel></div>
      <Panel title="Where you stand in this section"><div className="grid gap-5 sm:grid-cols-2"><div><div className="mb-1.5 flex justify-between text-sm"><span>{experience.progress}</span><span className="tabular-nums text-muted-foreground">{sectionMeasures.learningProgress}%</span></div><Progress value={sectionMeasures.learningProgress} /><p className="mt-1.5 text-xs text-muted-foreground">{sectionMeasures.activitiesCompleted} of {sectionMeasures.activitiesTotal} activities done</p></div><div><div className="mb-1.5 flex justify-between text-sm"><span>{experience.mastery}</span><span className="tabular-nums text-muted-foreground">{sectionMeasures.overallMastery}%</span></div><Progress value={sectionMeasures.overallMastery} /><p className="mt-1.5 text-xs text-muted-foreground">{sectionMeasures.assessmentsTaken > 0 ? "Your best result on the final section quiz." : "Take the final section quiz to set this."}</p></div></div></Panel>
    </LearningStage>

    <LearningStage id="keep-handy" number={stageNo(5)} title={experience.reference} icon={<Sparkles />}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div id={lessonConceptAnchor(lessonSectionId(topic.id, "key-terms"))} className="scroll-mt-24"><Panel title="Key Terms"><dl className="divide-y divide-border">{keywords.map((item) => <div key={item.term} className="grid gap-1 py-3 text-sm sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="font-medium text-foreground">{item.term}</dt><dd className="leading-7 text-muted-foreground">{item.meaning}</dd></div>)}</dl></Panel></div>
        {deepLesson?.depth ? <div id={lessonConceptAnchor(lessonSectionId(topic.id, "reference"))} className="scroll-mt-24"><LessonReferencePanel depth={deepLesson.depth} /></div> : null}
      </div>
      <Panel title="Interview Questions"><ListSection title="Questions to rehearse" items={module.interviewQuestions} /></Panel>
      <TopicKnowledgePanel topicId={topic.id} />
      <AnnotationPanel target={{ kind: "lesson", id: lesson.id, label: topic.title, href: `/topics/${topic.id}` }} title="Lesson notes and bookmark" description="" />
      <ContentReportButton kind="lesson" refId={topic.id} label={topic.title} />
      <LessonSources resources={[...resources, ...ownerLessonSourcesFor(topic.id)]} topicId={topic.id} />
    </LearningStage>
  </div>;
}

function LearningStage({ id, number, title, help, icon, tone, children }: { id: string; number: string; title: string; help?: string; icon: ReactNode; tone?: "practice" | "proof"; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <div className="mb-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl border text-primary [&>svg]:size-6 ${tone === "proof" ? "border-success/30 bg-success/10" : "border-primary/20 bg-primary/10"}`} aria-hidden>
            {icon}
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Stage {number}</p>
            <div className="flex items-center gap-1.5">
              <h2 id={`${id}-title`} className="font-display text-2xl font-bold text-foreground">{title}</h2>
              {help ? <HelpTip label={`${title} passing requirement`}>{help}</HelpTip> : null}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

const kindLabels: Record<Resource["kind"], string> = { course: "Course", article: "Article", docs: "Documentation", "learning-path": "Learning path", video: "Video" };

export function mediaFor(topic: Topic): Resource[] {
  const owner = ownerLessonSourcesFor(topic.id);
  const direct = resources.filter((resource) => resource.topicIds.includes(topic.id));
  const related = resources.filter(
    (resource) => !direct.includes(resource) && resource.certificationId === topic.certificationId,
  );
  // Workbook Sources / Read & Watch entries are first-class topic media.
  // Keep built-in resources as a fallback/supplement, but never hide an
  // owner-provided reading or video just because this domain has no static
  // resource catalogue entry.
  return [...owner, ...direct, ...related.slice(0, Math.max(0, 4 - direct.length))]
    .filter((resource, index, all) =>
      all.findIndex((candidate) => candidate.url === resource.url && candidate.kind === resource.kind) === index,
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

function ContentSection({ title, text }: { title: string; text: string }) { return <section><h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2><p>{text}</p></section>; }
function ListSection({ title, items, ordered = false }: { title: string; items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return <section><h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2><Tag className={ordered ? "list-decimal space-y-2 pl-5" : "space-y-2"}>{items.map((item) => <li key={item} className={ordered ? "pl-1" : "flex gap-3"}>{ordered ? item : <><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" /><span>{item}</span></>}</li>)}</Tag></section>;
}
