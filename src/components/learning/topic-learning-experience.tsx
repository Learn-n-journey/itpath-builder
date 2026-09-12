import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit3, ExternalLink, FileText, PlayCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { AnnotationPanel } from "@/components/annotations/annotation-panel";
import { Panel } from "@/components/page-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { lessons, resources, type Resource, type Topic } from "@/data/static-content";
import { getWorkedExamples } from "@/data/worked-examples";
import { getDeepLesson } from "@/data/deep-lessons";
import { DeepLessonReading } from "@/components/learning/deep-lesson-reading";
import { WorkedExamples } from "@/components/learning/worked-examples";
import { getLearningModule, getPracticeActivity, getRealWorldScenario, getRecallQuestions } from "@/data/learning-content";
import type { TopicProgress } from "@/lib/app-data/types";
import { useAppState } from "@/state/app-state";

const progressLabels: Array<[keyof Pick<TopicProgress, "understanding" | "recall" | "application" | "practicalAbility" | "troubleshooting" | "retention">, string]> = [
  ["understanding", "Understanding"], ["recall", "Recall"], ["application", "Application"],
  ["practicalAbility", "Practical ability"], ["troubleshooting", "Troubleshooting"], ["retention", "Retention"],
];

function normalize(text: string) { return text.toLowerCase().replace(/[^a-z0-9\s]/g, " "); }
function matchConcepts(answer: string, concepts: string[]) {
  const normalized = normalize(answer);
  return concepts.filter((concept) => normalized.includes(normalize(concept)));
}

export function TopicLearningExperience({ topic }: { topic: Topic }) {
  const { user, actions } = useAppState();
  const lesson = lessons.find((item) => item.topicId === topic.id);
  const module = getLearningModule(topic.id);
  const deepLesson = getDeepLesson(topic.id);
  const recallQuestions = getRecallQuestions(topic.id);
  const practice = getPracticeActivity(topic.id);
  const scenario = getRealWorldScenario(topic.id);
  const savedTeachBack = user.teachBackResponses[topic.id];
  const savedScenario = user.scenarioResponses[topic.id];
  const [recallAnswers, setRecallAnswers] = useState<Record<string, string>>({});
  const [recallFeedback, setRecallFeedback] = useState<Record<string, { correct: boolean; message: string }>>({});
  const [practiceChoice, setPracticeChoice] = useState<number | null>(null);
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);
  const [teachBack, setTeachBack] = useState(savedTeachBack?.body ?? "");
  const [teachBackEditing, setTeachBackEditing] = useState(!savedTeachBack);
  const [scenarioAnswer, setScenarioAnswer] = useState(savedScenario?.response ?? "");
  const [scenarioFeedback, setScenarioFeedback] = useState<string | null>(savedScenario ? scenario?.guidance ?? null : null);
  

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

  function submitRecall(questionId: string) {
    const question = recallQuestions.find((item) => item.id === questionId);
    const answer = recallAnswers[questionId]?.trim();
    if (!question || !answer) { toast.error("Write an answer before checking it."); return; }
    const matched = matchConcepts(answer, question.acceptedConcepts);
    const correct = matched.length >= Math.min(2, question.acceptedConcepts.length);
    const now = new Date().toISOString();
    actions.addRecallResponse({ id: crypto.randomUUID(), questionId, topicId: topic.id, answer, correct, matchedConcepts: matched, createdAt: now });
    if (!correct) {
      actions.recordMistake({
        topicId: topic.id,
        activity: "recall",
        category: matched.length === 0 ? "didnt_know_fact" : "misunderstood_concept",
        severity: matched.length === 0 ? "high" : "medium",
        questionId,
        createdAt: now,
      });
      actions.ensureReview({ topicId: topic.id });
    }
    setRecallFeedback((current) => ({ ...current, [questionId]: { correct, message: question.explanation } }));
    raiseProgress({ recall: Math.max(progress.recall, correct ? 35 : 10), retention: Math.max(progress.retention, correct ? 15 : 5) });
  }

  function submitPractice() {
    if (!practice || practiceChoice === null) { toast.error("Choose an answer first."); return; }
    const correct = practiceChoice === practice.answerIndex;
    actions.addPracticeResponse({ id: crypto.randomUUID(), activityId: practice.id, topicId: topic.id, selectedIndex: practiceChoice, correct, createdAt: new Date().toISOString() });
    setPracticeFeedback(`${correct ? "Correct. " : "Not yet. "}${practice.explanation}`);
    raiseProgress({ application: Math.max(progress.application, correct ? 35 : 10), practicalAbility: Math.max(progress.practicalAbility, correct ? 25 : 10) });
  }

  function saveTeachBack() {
    const body = teachBack.trim();
    if (!body) { toast.error("Write your explanation before saving."); return; }
    const now = new Date().toISOString();
    actions.setTeachBackResponse({ id: savedTeachBack?.id ?? crypto.randomUUID(), topicId: topic.id, body, createdAt: savedTeachBack?.createdAt ?? now, updatedAt: now });
    raiseProgress({ understanding: Math.max(progress.understanding, 25), retention: Math.max(progress.retention, 10) });
    setTeachBackEditing(false); toast.success("Teach back saved.");
  }

  function submitScenario() {
    if (!scenario || !scenarioAnswer.trim()) { toast.error("Explain your decision first."); return; }
    const matched = matchConcepts(scenarioAnswer, scenario.expectedConcepts);
    const meetsCriteria = matched.length >= Math.min(2, scenario.expectedConcepts.length);
    const now = new Date().toISOString();
    actions.setScenarioResponse({ id: savedScenario?.id ?? crypto.randomUUID(), scenarioId: scenario.id, topicId: topic.id, response: scenarioAnswer.trim(), matchedConcepts: matched, meetsCriteria, createdAt: savedScenario?.createdAt ?? now, updatedAt: now });
    setScenarioFeedback(`${meetsCriteria ? "Your reasoning includes key evidence. " : "Strengthen your reasoning. "}${scenario.guidance}`);
    raiseProgress({ application: Math.max(progress.application, meetsCriteria ? 50 : 20), troubleshooting: Math.max(progress.troubleshooting, meetsCriteria ? 40 : 15), practicalAbility: Math.max(progress.practicalAbility, meetsCriteria ? 35 : 15) });
  }


  const averageProgress = useMemo(() => Math.round(progressLabels.reduce((sum, [key]) => sum + progress[key], 0) / progressLabels.length), [progress]);
  if (!lesson || !module || !practice || !scenario) return null;

  return <div className="space-y-4">
    <Panel title="Learning objectives">
      <ul className="space-y-3">{topic.learningObjectives.map((objective) => <li key={objective} className="flex gap-3 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><span>{objective}</span></li>)}</ul>
    </Panel>


    <Tabs defaultValue="learn" className="space-y-4">
      <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
        <TabsTrigger value="learn">Learn</TabsTrigger><TabsTrigger value="recall">Recall</TabsTrigger><TabsTrigger value="practice">Practice</TabsTrigger><TabsTrigger value="teach-back">Teach Back</TabsTrigger><TabsTrigger value="scenario">Real-World Scenario</TabsTrigger>
      </TabsList>
      <TabsContent value="learn" className="space-y-4">{deepLesson ? <DeepLessonReading lesson={deepLesson} /> : null}<Panel title={deepLesson ? "Quick reference" : lesson.title} description={deepLesson ? "A condensed summary of the lesson above, for revision." : lesson.body}><div className="space-y-7 text-sm leading-7 text-muted-foreground">
        <ContentSection title="What It Is" text={lesson.definition} /><ContentSection title="Why It Matters" text={lesson.whyItMatters} />
        <ListSection title="How It Works" items={module.howItWorks} /><ListSection title="Where You See It" items={module.whereYouSeeIt} />
        <section><h2 className="mb-3 text-base font-semibold text-foreground">Key Terms</h2><dl className="divide-y divide-border border-y border-border">{lesson.keyTerms.map((item) => <div key={item.term} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4"><dt className="font-medium text-foreground">{item.term}</dt><dd>{item.meaning}</dd></div>)}</dl></section>
        <ListSection title="Examples" items={lesson.realWorldExamples} /><ListSection title="Common Problems" items={module.commonProblems} /><ListSection title="How It Fails" items={module.howItFails} /><ListSection title="How to Troubleshoot" items={module.troubleshooting} ordered /><ListSection title="Practical Knowledge" items={module.practicalKnowledge} /><ListSection title="Exam Coverage" items={module.examCoverage} /><ListSection title="Interview Questions" items={module.interviewQuestions} />
      </div></Panel><WorkedExamples examples={getWorkedExamples(topic.id)} /><MediaPanel topic={topic} /></TabsContent>
      <TabsContent value="recall"><div className="space-y-4">{recallQuestions.map((question, index) => {
        const feedback = recallFeedback[question.id];
        return <Panel key={question.id} title={`Recall ${index + 1}`} description={question.prompt}><Label htmlFor={question.id}>Your answer</Label><Textarea id={question.id} className="mt-2" rows={4} value={recallAnswers[question.id] ?? ""} onChange={(event) => setRecallAnswers((current) => ({ ...current, [question.id]: event.target.value }))} /><Button className="mt-3" onClick={() => submitRecall(question.id)}>Check answer</Button>{feedback ? <p role="status" className={`mt-3 text-sm ${feedback.correct ? "text-primary" : "text-destructive"}`}>{feedback.correct ? "Correct. " : "Needs review. "}{feedback.message}</p> : null}</Panel>;
      })}</div></TabsContent>
      <TabsContent value="practice"><Panel title={practice.title} description={practice.prompt}><div className="grid gap-2">{practice.choices.map((choice, index) => <Button key={choice} variant={practiceChoice === index ? "secondary" : "outline"} className="h-auto justify-start whitespace-normal py-3 text-left" onClick={() => setPracticeChoice(index)}>{choice}</Button>)}</div><Button className="mt-4" onClick={submitPractice}>Check decision</Button>{practiceFeedback ? <p role="status" className="mt-3 text-sm text-muted-foreground">{practiceFeedback}</p> : null}</Panel></TabsContent>
      <TabsContent value="teach-back"><Panel title="Teach Back" description="Explain this topic in your own words.">{teachBackEditing ? <><Label htmlFor="teach-back">Your explanation</Label><Textarea id="teach-back" className="mt-2" rows={7} value={teachBack} onChange={(event) => setTeachBack(event.target.value)} /><div className="mt-3 flex flex-wrap gap-2"><Button onClick={saveTeachBack}><Save />Save</Button>{savedTeachBack ? <Button variant="outline" onClick={() => { setTeachBack(savedTeachBack.body); setTeachBackEditing(false); }}><FileText />Review saved response</Button> : null}</div></> : <><div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">{savedTeachBack?.body}</div><Button className="mt-3" variant="outline" onClick={() => setTeachBackEditing(true)}><Edit3 />Edit</Button></>}</Panel></TabsContent>
      <TabsContent value="scenario"><Panel title={scenario.title} description={scenario.situation}><p className="mb-4 text-sm font-medium">{scenario.decisionPrompt}</p><Label htmlFor="scenario-answer">Your decision and reasoning</Label><Textarea id="scenario-answer" className="mt-2" rows={6} value={scenarioAnswer} onChange={(event) => setScenarioAnswer(event.target.value)} /><Button className="mt-3" onClick={submitScenario}>Evaluate reasoning</Button>{scenarioFeedback ? <p role="status" className="mt-3 text-sm text-muted-foreground">{scenarioFeedback}</p> : null}</Panel></TabsContent>
    </Tabs>

    <div className="grid gap-4 lg:grid-cols-2">
      <AnnotationPanel
        target={{ kind: "lesson", id: lesson.id, label: topic.title, href: `/topics/${topic.id}` }}
        title="Lesson notes and bookmark"
        description="Notes and bookmarks for this lesson, saved with everything else you have marked."
      />
      <Panel title="Learning progress" description={`${averageProgress}% across six evidence areas. Reading alone does not change progress.`}><div className="space-y-4">{progressLabels.map(([key, label]) => <div key={key}><div className="mb-1.5 flex justify-between text-sm"><span>{label}</span><span className="tabular-nums text-muted-foreground">{progress[key]}%</span></div><Progress value={progress[key]} /></div>)}</div></Panel>
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
