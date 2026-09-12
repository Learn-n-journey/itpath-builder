/**
 * Builds guided labs for every curriculum topic from that topic's own module
 * content: how it works, where you see it, common problems, how it fails and
 * the documented troubleshooting order. Nothing is placeholder text and no lab
 * claims access to an external machine, network or cloud account.
 */
import { learningModules } from "@/data/learning-content";
import type { Lab, Lesson, Topic } from "@/lib/app-data/types";

type LabCategory = Lab["category"];

const CATEGORY_RULES: Array<[LabCategory, RegExp]> = [
  ["powershell", /powershell/i],
  ["bash", /bash|shell script/i],
  ["dns", /dns|name resolution/i],
  ["cloud", /cloud|virtualiz|container|kubernetes/i],
  ["linux", /linux|unix/i],
  ["windows", /windows|active directory|registry|group policy/i],
  ["security", /secur|threat|risk|malware|incident|forensic|crypt|pentest|vulnerab|identity|access control|complian/i],
  ["networking", /network|routing|switch|wireless|subnet|firewall|vpn|tcp|ip addressing|protocol/i],
  ["hardware", /hardware|storage|printer|mobile device|power|server hardware/i],
];

function categoryFor(topic: Topic): LabCategory {
  const text = `${topic.title} ${topic.summary}`;
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) return category;
  }
  return "windows";
}

function checklist(prefix: string, labels: string[]) {
  const points = Math.round(100 / Math.max(labels.length, 1));
  return labels.map((label, index) => ({ id: `${prefix}-${index + 1}`, label, points }));
}

function sentence(text: string): string {
  const trimmed = text.trim();
  return trimmed.endsWith(".") || trimmed.endsWith("?") ? trimmed : `${trimmed}.`;
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Two labs per topic: a documentation lab and a fault-diagnosis drill. */
export function buildTopicLabs(topics: Topic[], lessons: Lesson[]): Lab[] {
  const out: Lab[] = [];

  for (const topic of topics) {
    const learningModule = learningModules.find((item) => item.topicId === topic.id);
    if (!learningModule) continue;
    const lesson = lessons.find((item) => item.topicId === topic.id);
    const slug = topic.id.replace(/^topic-/, "");
    const category = categoryFor(topic);
    const where = learningModule.whereYouSeeIt[0] ?? topic.summary;
    const terms = (lesson?.keyTerms ?? []).slice(0, 3);
    const prerequisites = [topic.title, "A computer or documentation you are authorized to inspect"];

    const studyInstructions = [
      `Write down what you already know about ${lower(topic.title)} before opening the lesson.`,
      ...learningModule.howItWorks.map((step) => `Record evidence for this behaviour in your own words: ${sentence(step)}`),
      `Find one place this appears in real work and describe it: ${sentence(where)}`,
      terms.length
        ? `Define these terms from memory, then correct yourself against the lesson: ${terms.map((term) => term.term).join(", ")}.`
        : `Summarise ${lower(topic.title)} in five sentences from memory, then correct yourself against the lesson.`,
      "Save your notes with today's date so you can compare them with a later attempt.",
    ];

    out.push({
      id: `lab-${slug}-documented-walkthrough`,
      topicId: topic.id,
      title: `${topic.title}: documented walkthrough`,
      category,
      objective: topic.learningObjectives[0] ?? `Explain and document how ${lower(topic.title)} works in practice.`,
      prerequisites,
      difficulty: topic.difficulty,
      estimatedMinutes: Math.max(25, Math.round(topic.estimatedMinutes * 0.7)),
      environment:
        "Your own notes plus any system or official documentation you are permitted to read. This lab is read-only: it never asks you to change a configuration you do not own.",
      instructions: studyInstructions,
      expectedResult: `A dated write-up that explains ${lower(topic.title)} accurately, with at least one real-world example and correct vocabulary.`,
      checklist: checklist(`${slug}-doc`, [
        "Recorded prior knowledge before reading",
        "Explained how it works in your own words",
        "Recorded a real-world example",
        "Defined the key vocabulary correctly",
        "Saved dated notes for later comparison",
      ]),
      reflectionPrompt: `Which part of ${lower(topic.title)} did you explain least confidently, and what evidence would make it clear?`,
      masteryScore: 100,
    });

    const problems = learningModule.commonProblems.slice(0, 3);
    const failures = learningModule.howItFails.slice(0, 2);
    const steps = learningModule.troubleshooting;
    if (problems.length === 0 || steps.length === 0) continue;

    const drillInstructions = [
      `Pick one fault to work through: ${problems.join("; ")}.`,
      ...failures.map((failure) => `Write the symptoms a user would report when this happens: ${sentence(failure)}`),
      ...steps.map((step, index) => `Step ${index + 1} — carry out and record the result of: ${sentence(step)}`),
      "State the single most likely cause, and say which observation rules out the alternatives.",
      "Write the fix, the verification you would run, and what you would put in the ticket notes.",
    ];

    out.push({
      id: `lab-${slug}-fault-drill`,
      topicId: topic.id,
      title: `${topic.title}: fault diagnosis drill`,
      category,
      objective: `Work a realistic ${lower(topic.title)} fault through a documented diagnostic order instead of guessing.`,
      prerequisites: [...prerequisites, "The documented walkthrough lab for this topic"],
      difficulty: topic.difficulty,
      estimatedMinutes: Math.max(30, Math.round(topic.estimatedMinutes * 0.8)),
      environment:
        "A written diagnostic exercise. You record the checks you would run and what each result would prove; the app does not inspect any real system for you.",
      instructions: drillInstructions,
      expectedResult:
        "A diagnostic record that follows the documented order, names one most-likely cause with supporting evidence, and ends with a fix plus a verification step.",
      checklist: checklist(`${slug}-drill`, [
        "Chose a specific fault and described the symptoms",
        "Followed the documented diagnostic order",
        "Recorded what each check would prove",
        "Named one most-likely cause with evidence",
        "Wrote a fix, a verification and ticket notes",
      ]),
      reflectionPrompt: "Which check gave you the most information for the least effort, and why would you run it earlier next time?",
      masteryScore: 100,
    });
  }

  return out;
}
