import { certifications, topics } from "@/data/static-content";
import { getTopic, getTopicProgress } from "@/lib/app-data/selectors";
import type { EntityId, UserData } from "@/lib/app-data/types";
import { computeDashboard } from "@/lib/dashboard-engine";
import { buildIntelligence } from "@/lib/intelligence/engine";
import { STATE_LABEL } from "@/lib/intelligence/states";
import { DIAGNOSIS_LABEL, METHOD_LABEL } from "@/lib/intelligence/types";
import { mistakeActivityLabels, mistakeCauseLabels, scoreAllSkills } from "@/lib/mistake-engine";

export type TutorMode =
  | "ask_anything"
  | "teach_me"
  | "socratic"
  | "quiz_me"
  | "explain_mistake"
  | "give_lab"
  | "troubleshoot_me"
  | "interview_me"
  | "exam_me"
  | "review_answer"
  | "study_plan";

export const tutorModes: { id: TutorMode; label: string; description: string }[] = [
  {
    id: "ask_anything",
    label: "Ask Anything",
    description: "Ask any question in your own words. Answers use the course material and your saved notes.",
  },
  { id: "teach_me", label: "Teach Me", description: "A structured explanation of the topic from the ground up." },
  { id: "socratic", label: "Socratic Tutor", description: "Questions that make you reason instead of being told." },
  { id: "quiz_me", label: "Quiz Me", description: "A mixed question set with answers held back until the end." },
  { id: "explain_mistake", label: "Explain My Mistake", description: "Root-cause analysis of your recorded errors." },
  { id: "give_lab", label: "Give Me a Lab", description: "A hands-on guided exercise with a checklist." },
  { id: "troubleshoot_me", label: "Troubleshoot Me", description: "An incident you have to diagnose step by step." },
  { id: "interview_me", label: "Interview Me", description: "A job interview drill for your target role." },
  { id: "exam_me", label: "Exam Me", description: "Exam-style questions against certification objectives." },
  { id: "review_answer", label: "Review My Answer", description: "Feedback on an answer you paste in." },
  { id: "study_plan", label: "Create Study Plan", description: "A plan built around your hours and weak areas." },
];

const experienceLabels: Record<string, string> = {
  none: "no prior IT experience",
  beginner: "beginner",
  some: "some hands-on experience",
  intermediate: "intermediate",
};

function list(lines: string[]): string {
  return lines.length > 0 ? lines.map((l) => `- ${l}`).join("\n") : "- (nothing recorded yet)";
}

export interface TutorContext {
  topicId?: EntityId;
  learnerAnswer?: string;
  /** A free-form question the learner typed themselves. */
  question?: string;
}

/** Builds the state-derived context block. Everything here comes from real saved data. */
export function buildContextBlock(user: UserData, ctx: TutorContext): string {
  const topic = ctx.topicId ? getTopic(ctx.topicId) : undefined;
  const settings = user.settings;
  const dash = computeDashboard(user);
  const sections: string[] = [];

  sections.push(
    [
      "LEARNER PROFILE",
      list([
        `Experience level: ${experienceLabels[settings.experienceLevel] ?? settings.experienceLevel}`,
        `Certification target: ${settings.certificationTarget || "not set"}`,
        `Study time: ${settings.studyHoursPerWeek} hours across ${settings.studyDays.length} study days, in ${settings.sessionLengthMinutes}-minute sessions`,
      ]),
    ].join("\n"),
  );

  if (topic) {
    const cert = certifications.find((c) => c.id === topic.certificationId);
    const progress = getTopicProgress(user, topic.id);
    const prereqs = topic.prerequisiteTopicIds
      .map((id) => getTopic(id)?.title)
      .filter((t): t is string => Boolean(t));
    sections.push(
      [
        "CURRENT TOPIC",
        list([
          `Title: ${topic.title}`,
          `Summary: ${topic.summary}`,
          `Certification: ${cert ? `${cert.title} (${cert.provider})` : "not mapped"}`,
          `Prerequisites: ${prereqs.length > 0 ? prereqs.join(", ") : "none"}`,
        ]),
        "",
        "LEARNING OBJECTIVES",
        list(topic.learningObjectives),
        "",
        "MY MEASURED PROGRESS ON THIS TOPIC (0-100, from my own recorded activity)",
        list(
          progress
            ? [
                `Status: ${progress.status.replace("_", " ")}`,
                `Understanding ${progress.understanding}`,
                `Recall ${progress.recall}`,
                `Application ${progress.application}`,
                `Practical ability ${progress.practicalAbility}`,
                `Troubleshooting ${progress.troubleshooting}`,
                `Retention ${progress.retention}`,
              ]
            : ["Not started, no recorded activity on this topic yet."],
        ),
      ].join("\n"),
    );
  }

  const intelligence = buildIntelligence(user);
  sections.push(
    [
      "LEARNING DIAGNOSIS (what my recorded work says about how I am struggling)",
      list(
        intelligence.queue
          .slice(0, 5)
          .map(
            (concept) =>
              `${concept.title}: ${STATE_LABEL[concept.state]}, ${DIAGNOSIS_LABEL[concept.diagnosis]} (${Math.round(concept.certainty * 100)}% certainty), ${concept.evidence} Best taught by: ${METHOD_LABEL[concept.method].toLowerCase()} at ${concept.difficulty} level.${concept.isDiagnostic ? " The cause is unconfirmed: check it before teaching around it." : ""}`,
          ),
      ),
    ].join("\n"),
  );

  const weak = scoreAllSkills(user)
    .filter((s) => s.weak)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((s) => `${s.skill.title} (${s.openMistakes} open mistake${s.openMistakes === 1 ? "" : "s"})`);
  sections.push(["WEAK AREAS", list(weak)].join("\n"));

  const mistakes = [...user.mistakes]
    .filter((m) => !m.resolved)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((m) => {
      const t = getTopic(m.topicId)?.title ?? m.topicId;
      return `${new Date(m.createdAt).toISOString().slice(0, 10)}, ${t}: ${mistakeCauseLabels[m.category]} during ${mistakeActivityLabels[m.activity]} (severity ${m.severity})`;
    });
  sections.push(["RECENT UNRESOLVED MISTAKES", list(mistakes)].join("\n"));

  const reviews = [...user.reviews]
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 6)
    .map((r) => {
      const t = getTopic(r.topicId)?.title ?? r.topicId;
      return `${t}: due ${new Date(r.dueAt).toISOString().slice(0, 10)}, ${r.interval}-day interval, streak ${r.successStreak}, lapses ${r.lapses}, status ${r.status}`;
    });
  sections.push(["REVIEW HISTORY", list(reviews)].join("\n"));

  sections.push(
    [
      "OVERALL PERFORMANCE",
      list([
        `Overall curriculum progress: ${dash.overallProgress}%`,
        `Knowledge ${dash.knowledge} / practical ${dash.practical} / troubleshooting ${dash.troubleshooting} / retention ${dash.retention}`,
        `Quiz average: ${dash.quizAttempts > 0 ? `${dash.quizAverage}% over ${dash.quizAttempts} attempt(s)` : "no quiz attempts yet"}`,
        `Practice tasks completed: ${dash.assignmentsCompleted}/${dash.assignmentsTotal}`,
        `Labs completed: ${dash.labsCompleted}/${dash.labsTotal}`,
        `Topics mastered: ${dash.masteredTopics}/${dash.topicsTotal}`,
        `Study time logged: ${dash.studyHoursTotal} hour(s), current streak ${dash.streakDays} day(s)`,
      ]),
    ].join("\n"),
  );

  return sections.join("\n\n");
}

function instructions(mode: TutorMode, topicTitle: string, ctx: TutorContext): string {
  switch (mode) {
    case "ask_anything":
      return `Answer my question below directly and in plain language, at my level. Draw on the IT PATH course material in my context, my own saved notes and second brain material where they apply, and your general knowledge where they do not. Say which of those an answer came from. If my question touches something my records show I am shaky on, say so briefly and point me at the next useful step. Do not turn this into a lesson unless I ask for one.\n\nMY QUESTION:\n${ctx.question?.trim() || "(type your question before sending)"}`;
    case "teach_me":
      return `Teach me ${topicTitle} from the ground up at my level. Cover what it is, why it matters, how it works, where I see it in a real IT job, key terms, worked examples, common problems, how it fails and how to troubleshoot it. Use my weak areas above to decide what to slow down on. End with three questions that check whether I understood.`;
    case "socratic":
      return `Be a Socratic tutor for ${topicTitle}. Ask me one question at a time, starting from what my progress above suggests I already know. Never give the answer straight away: if I am wrong, ask a narrower question that exposes the gap. After five exchanges, summarise what I understand and what I do not.`;
    case "quiz_me":
      return `Quiz me on ${topicTitle}. Give 10 questions mixing multiple choice, multiple response, scenario, troubleshooting, short answer and command questions. At least 40% must require reasoning or application, not recall. Number the questions and hold back all answers until I reply with mine, then mark each one and name the mistake category.`;
    case "explain_mistake":
      return `Work through my unresolved mistakes above. For each one, explain the underlying concept I got wrong, tell me whether the root cause is a missing prerequisite or a misunderstanding of the topic itself, and give one short exercise that would prove I fixed it. Prioritise prerequisites before advanced material.`;
    case "give_lab":
      return `Design a hands-on lab for ${topicTitle} I can do on my own machine or a free VM. Include objective, prerequisites, environment and setup, numbered instructions, expected result, a verification checklist and reflection questions. Do not assume I have paid infrastructure.`;
    case "troubleshoot_me":
      return `Give me a realistic incident involving ${topicTitle}. Describe the symptoms only. Wait for me to request diagnostic actions one at a time and respond with realistic output for each. Do not reveal the cause when I choose a wrong action. When I state a diagnosis and fix, score my diagnostic choices, technical accuracy, reasoning, efficiency, verification and documentation.`;
    case "interview_me":
      return `Run a technical interview for the role above, focused on ${topicTitle} and my weak areas. Ask one question at a time, follow up on vague answers like a real interviewer, and at the end give me a hire/no-hire read with the specific gaps that cost me.`;
    case "exam_me":
      return `Act as an exam simulator for my certification target, weighted toward ${topicTitle} and my weak areas. Use exam-style wording and distractors, 15 questions, no answers until I submit. Then report score, which exam objectives I failed and what to review first.`;
    case "review_answer":
      return `Review my answer below against ${topicTitle}. Grade it on technical accuracy, completeness, reasoning and clarity, quote the exact parts that are wrong or vague, give the correct version, and name the mistake category.\n\nMY ANSWER:\n${ctx.learnerAnswer?.trim() || "(paste your answer here before sending)"}`;
    case "study_plan":
      return `Build me a study plan using my selected certification, study days and session length above. Schedule due reviews and weak prerequisites before new material, then practice, labs and a quiz. Give each session a length in minutes and a concrete deliverable. Do not schedule more than my available time.`;
    default:
      return "";
  }
}

export function generateTutorPrompt(user: UserData, mode: TutorMode, ctx: TutorContext): string {
  const topic = ctx.topicId ? getTopic(ctx.topicId) : undefined;
  const topicTitle = topic ? topic.title : "the topics I am weakest in";
  const modeLabel = tutorModes.find((m) => m.id === mode)?.label ?? mode;

  return [
    `You are my IT and cybersecurity tutor. Mode: ${modeLabel}.`,
    "",
    "TASK",
    instructions(mode, topicTitle, ctx),
    "",
    "CONTEXT ABOUT ME (generated from my own study records)",
    buildContextBlock(user, ctx),
    "",
    "RULES",
    list([
      "Correct me when I am wrong; do not be encouraging about answers that are inaccurate.",
      "Assume nothing beyond the progress and mistakes listed above.",
      "Prefer fixing weak prerequisites before moving to more advanced material.",
      "Use concrete commands, outputs and real-world examples rather than abstract description.",
    ]),
  ].join("\n");
}

export const tutorTopicOptions = topics.map((t) => ({ id: t.id, title: t.title }));
