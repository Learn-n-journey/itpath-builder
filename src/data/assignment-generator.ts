/**
 * Builds practice assignments for every curriculum topic from the topic's own
 * objectives, key terms and module content. Nothing here is placeholder text:
 * each assignment quotes real material belonging to that topic.
 */
import { learningModules } from "@/data/learning-content";
import type { Assignment, AssignmentType, Lesson, Topic } from "@/lib/app-data/types";

const instructions = [
  "Read the task and identify the evidence required.",
  "Write a complete response in the workspace.",
  "Save your draft, then submit when it is ready for evaluation.",
];

interface Draft {
  type: AssignmentType;
  title: string;
  brief: string;
  responsePrompt: string;
  criteria: string[];
  /** When present the response is checked for these exact concepts. */
  concepts?: string[];
}

function clip(text: string, words = 16): string {
  const parts = text.replace(/\.$/, "").split(/\s+/);
  return parts.length <= words ? parts.join(" ") : `${parts.slice(0, words).join(" ")}…`;
}

function buildDrafts(topic: Topic, lesson: Lesson | undefined): Draft[] {
  const module = learningModules.find((item) => item.topicId === topic.id);
  const drafts: Draft[] = [];
  const terms = lesson?.keyTerms ?? [];
  const objectives = topic.learningObjectives;

  if (objectives[0]) {
    drafts.push({
      type: "explain",
      title: `Explain: ${clip(objectives[0], 8)}`,
      brief: `${topic.title}: ${objectives[0]}`,
      responsePrompt: `In your own words, explain this in enough detail that a new colleague could follow it: ${objectives[0]}`,
      criteria: [
        "Explain the idea accurately in plain language",
        "Use correct technical vocabulary from the lesson",
        "Give one concrete example from real equipment or services",
      ],
    });
  }

  if (terms.length >= 3) {
    drafts.push({
      type: "recall",
      title: `Recall the key terms of ${topic.title}`,
      brief: `Recall and define the core vocabulary of ${topic.title} without looking at the lesson.`,
      responsePrompt: `Define each of these in one sentence: ${terms
        .slice(0, 4)
        .map((term) => term.term)
        .join(", ")}.`,
      criteria: terms.slice(0, 4).map((term) => `Define ${term.term} correctly`),
      concepts: terms.slice(0, 4).map((term) => term.term),
    });
  }

  if (terms.length >= 2 && terms[0] && terms[1]) {
    drafts.push({
      type: "compare",
      title: `Compare ${terms[0].term} and ${terms[1].term}`,
      brief: `Set ${terms[0].term} against ${terms[1].term} and show where each one belongs.`,
      responsePrompt: `Compare ${terms[0].term} and ${terms[1].term}: what each one is, how they differ, and when you would talk about one rather than the other.`,
      criteria: [
        `Describe ${terms[0].term} correctly`,
        `Describe ${terms[1].term} correctly`,
        "State a clear difference and a situation for each",
      ],
    });
  }

  if (module?.howItWorks[0]) {
    drafts.push({
      type: "teach_back",
      title: `Teach back: how ${topic.title.toLowerCase()} works`,
      brief: `Teach the working of ${topic.title.toLowerCase()} to someone who has never met it.`,
      responsePrompt: `Teach it step by step, without unexplained jargon. Start from: ${module.howItWorks[0]}`,
      criteria: [
        "Work through the steps in a sensible order",
        "Explain every term you introduce",
        "Finish with a check that the listener understood",
      ],
    });
  }

  if (module?.whereYouSeeIt[0]) {
    drafts.push({
      type: "scenario",
      title: `Scenario: ${clip(module.whereYouSeeIt[0], 7)}`,
      brief: `Apply ${topic.title.toLowerCase()} in a real setting: ${module.whereYouSeeIt[0]}`,
      responsePrompt: `You are the technician on site. Describe what you would check first, what questions you would ask, and how this topic shapes your decision. Setting: ${module.whereYouSeeIt[0]}`,
      criteria: [
        "Identify the relevant facts before acting",
        "Apply the topic correctly to the situation",
        "Explain your decision and the next step",
      ],
    });
  }

  if (module?.commonProblems[0]) {
    drafts.push({
      type: "troubleshoot",
      title: `Troubleshoot: ${clip(module.commonProblems[0], 7)}`,
      brief: `Work through a fault caused by: ${module.commonProblems[0]}`,
      responsePrompt: `Give a safe, ordered troubleshooting sequence for this problem, the evidence that confirms or rejects your theory at each step, and how you would verify the fix. Problem: ${module.commonProblems[0]}`,
      criteria: [
        "Work from the simplest, safest check upward",
        "State the evidence that confirms or rejects the cause",
        "Verify the fix before closing",
      ],
    });
  }

  if (module?.howItFails[0]) {
    drafts.push({
      type: "incident",
      title: `Incident record: ${clip(module.howItFails[0], 7)}`,
      brief: `Document an incident of the kind described here: ${module.howItFails[0]}`,
      responsePrompt: `Write an incident record: symptoms, scope, times, evidence gathered, actions taken, result, and the condition that would make you escalate.`,
      criteria: [
        "Record observable facts, not guesses",
        "Separate evidence from assumption",
        "Define the next action and escalation point",
      ],
    });
  }

  if (module?.practicalKnowledge[0]) {
    drafts.push({
      type: "build",
      title: `Build: ${clip(module.practicalKnowledge[0], 7)}`,
      brief: `Turn practical knowledge into a written specification: ${module.practicalKnowledge[0]}`,
      responsePrompt: `Write the specification or configuration you would actually use, and justify each choice. Starting point: ${module.practicalKnowledge[0]}`,
      criteria: [
        "Produce a complete, usable specification",
        "Justify each choice technically",
        "Note one risk and how you would handle it",
      ],
    });
  }

  if (module?.troubleshooting[0]) {
    drafts.push({
      type: "design",
      title: `Design a checklist for ${topic.title.toLowerCase()}`,
      brief: `Design a repeatable checklist a colleague could follow for ${topic.title.toLowerCase()}.`,
      responsePrompt: `Write the checklist in order, with what to record at each step. Base the first step on: ${module.troubleshooting[0]}`,
      criteria: [
        "Cover the whole task in order",
        "Make every step checkable by someone else",
        "Say what gets recorded at each step",
      ],
    });
  }

  if (module?.examCoverage[0]) {
    drafts.push({
      type: "exam_simulation",
      title: `Exam drill: ${clip(module.examCoverage[0], 7)}`,
      brief: `Answer under exam conditions on: ${module.examCoverage[0]}`,
      responsePrompt: `Answer directly and briefly, as you would in the exam: ${module.examCoverage[0]}`,
      criteria: ["Answer the question that was asked", "Stay technically accurate", "Keep it concise"],
    });
  }

  if (module?.interviewQuestions[0]) {
    drafts.push({
      type: "configure",
      title: `Interview answer: ${clip(module.interviewQuestions[0], 8)}`,
      brief: `Prepare a strong interview answer about ${topic.title.toLowerCase()}.`,
      responsePrompt: `Answer as you would in a job interview, with a short example from your own study: ${module.interviewQuestions[0]}`,
      criteria: [
        "Answer clearly and confidently",
        "Show the underlying understanding",
        "Support it with a concrete example",
      ],
    });
  }

  if (topic.difficulty === "challenging" && objectives.length >= 2) {
    drafts.push({
      type: "capstone",
      title: `Capstone: ${topic.title}`,
      brief: `Bring the whole topic together into one documented piece of work.`,
      responsePrompt: `Produce a documented piece of work that covers all of these: ${objectives.join(" ")} Include your plan, the steps, how you would validate the result, and how you would roll back.`,
      criteria: [
        "Cover every objective of the topic",
        "Show a clear plan and sequence",
        "Include validation and rollback",
      ],
    });
  }

  return drafts;
}

export function buildTopicAssignments(topics: Topic[], lessons: Lesson[]): Assignment[] {
  return topics.flatMap((topic) => {
    const lesson = lessons.find((item) => item.topicId === topic.id);
    return buildDrafts(topic, lesson).map((draft, index): Assignment => {
      const id = `assignment-${topic.id.replace(/^topic-/, "")}-${draft.type.replaceAll("_", "-")}`;
      const automatic = Boolean(draft.concepts?.length);
      return {
        id,
        topicId: topic.id,
        title: draft.title,
        brief: draft.brief,
        type: draft.type,
        responsePrompt: draft.responsePrompt,
        evaluationMode: automatic ? "automatic" : "self_rubric",
        instructions,
        rubric: draft.criteria.map((description, criterionIndex) => ({
          id: `${id}-criterion-${index + 1}-${criterionIndex + 1}`,
          label: `Criterion ${criterionIndex + 1}`,
          description,
          points: 100 / draft.criteria.length,
          ...(automatic && draft.concepts?.[criterionIndex]
            ? { acceptedConcepts: [draft.concepts[criterionIndex]] }
            : {}),
        })),
      };
    });
  });
}
