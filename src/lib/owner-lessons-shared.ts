/**
 * Owner spreadsheet lessons: workbook tabs in, a finished lesson out.
 *
 * One workbook per topic, numbered exactly like the quiz spreadsheets: the
 * leading number in the filename picks the topic, 1 being the first topic of
 * that course in curriculum order. The workbooks live in the "itpath lessons"
 * and "autopath lessons" folders.
 *
 * Nothing in here decides a lesson is good. The same deterministic checks the
 * built-in lessons must pass decide whether an owner lesson may be published.
 */
import type { DeepLesson, LessonCheck, LessonReferenceRow } from "@/data/deep-lessons/types";
import type {
  PracticeActivity,
  RealWorldScenario,
  RecallQuestion,
  Resource,
} from "@/lib/app-data/types";
import type { WorkedExample } from "@/data/worked-examples";
import { deepLessonIssues } from "@/lib/lesson-quality";
import type { NumberedTopic } from "@/lib/owner-questions-shared";

/** The rest of a topic's work, when the workbook supplies it. */
export interface OwnerLabItem {
  /** Item number for this topic's lab, 1 upwards. */
  number: number;
  clue: string;
  name: string;
  answerFunction: string;
  /** Where the learner should practise it: a tool name or an in-app path. */
  practiceIn?: string;
}

export interface OwnerLessonExtras {
  recall: RecallQuestion[];
  /** Numbered identification-lab items written on the Labs tab. */
  labs?: OwnerLabItem[];
  teachBack?: { prompt: string; expectedPoints: string[] };
  scenario?: RealWorldScenario;
  workedExamples: WorkedExample[];
}

/** A worksheet as read from the workbook: tab name plus its rows of cells. */
export interface SheetTab {
  name: string;
  rows: string[][];
}

/** Tabs of the four folder templates, in the order the workbooks use them. */
export const LESSON_FOLDER_TABS = [
  "Lesson",
  "Sections",
  "Key ideas",
  "Walkthrough",
  "Reference",
  "Misconceptions",
  "Exam traps",
  "Check yourself",
  "Sources",
  "Plain words",
  "Worked examples",
] as const;

export const TRY_IT_FOLDER_TABS = [
  "Practice",
  "Recall",
  "Teach back",
  "Real world scenario",
] as const;

export const QUIZ_FOLDER_TABS = ["Quiz"] as const;

export const LABS_FOLDER_TABS = ["Labs"] as const;

export const LESSON_TABS = [
  "Lesson",
  "Sections",
  "Key ideas",
  "Walkthrough",
  "Reference",
  "Misconceptions",
  "Exam traps",
  "Check yourself",
  "Sources",
  "Plain words",
  "Practice",
  "Recall",
  "Teach back",
  "Real world scenario",
  "Worked examples",
  "Labs",
  "Quiz",
] as const;

/** Headers of each tab, in column order. The template workbook uses these. */
export const LESSON_TAB_HEADERS: Record<string, string[]> = {
  Lesson: ["Title", "Reading minutes", "Intro", "Where you meet it"],
  Sections: ["Heading", "Paragraph", "Bullets"],
  "Key ideas": ["Idea"],
  Walkthrough: ["Title", "Scenario", "Step label", "Step detail", "Outcome"],
  Reference: ["Reference heading", "Term", "Detail"],
  Misconceptions: ["Claim", "Correction"],
  "Exam traps": ["Trap"],
  "Check yourself": ["Question", "Answer"],
  Sources: ["Label", "URL", "Kind"],
  "Plain words": ["Plain intro", "Term", "In plain words"],
  Practice: [
    "Title",
    "Prompt",
    "Choice A",
    "Choice B",
    "Choice C",
    "Choice D",
    "Correct",
    "Explanation",
  ],
  Recall: ["Prompt", "Accepted concepts", "Explanation"],
  "Teach back": ["Prompt", "Expected point"],
  "Real world scenario": [
    "Title",
    "Situation",
    "Decision prompt",
    "Expected concepts",
    "Guidance",
  ],
  Labs: ["Number", "Clue", "Name", "What it does", "Practice in"],
  Quiz: [
    "ID",
    "Course",
    "Topic",
    "Question",
    "Choice A",
    "Choice B",
    "Choice C",
    "Choice D",
    "Correct",
    "Explanation",
    "Source name",
    "Source URL",
    "Objective",
    "Difficulty",
  ],
  "Worked examples": [
    "Title",
    "Question",
    "Step label",
    "Step detail",
    "Answer",
    "Try it prompt",
    "Try it answer",
  ],
};

const CORRECT_LETTERS = ["A", "B", "C", "D"];

const key = (value: string) => value.trim().toLowerCase();

export function body(tabs: SheetTab[], name: string): string[][] {
  const tab = tabs.find((item) => key(item.name) === key(name));
  if (!tab) return [];
  return tab.rows
    .slice(1)
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some(Boolean));
}

export const cell = (row: string[] | undefined, index: number): string => (row?.[index] ?? "").trim();

export function splitList(value: string): string[] {
  return value
    .split(/\r?\n|\s\|\s|\|/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

export interface OwnerLessonResult {
  lesson: DeepLesson | null;
  sources: Resource[];
  /** Practice questions written on the workbook's Practice tab. */
  practice: PracticeActivity[];
  /** Recall, teach back, scenario and worked examples from their own tabs. */
  extras: OwnerLessonExtras;
  rejectReasons?: string[];
  error?: string;
}

const EMPTY_EXTRAS: OwnerLessonExtras = { recall: [], workedExamples: [] };

/** Labs tab -> numbered identification items for this topic. */
export function labsFromTabs(tabs: SheetTab[]): OwnerLabItem[] {
  const items: OwnerLabItem[] = [];
  body(tabs, "Labs").forEach((row, index) => {
    const name = cell(row, 2);
    const answerFunction = cell(row, 3);
    if (!name || !answerFunction) return;
    const given = Number.parseInt(cell(row, 0), 10);
    items.push({
      number: Number.isFinite(given) && given > 0 ? given : index + 1,
      clue: cell(row, 1),
      name,
      answerFunction,
      ...(cell(row, 4) ? { practiceIn: cell(row, 4) } : {}),
    });
  });
  return items.sort((left, right) => left.number - right.number);
}

/** Recall, Teach back, Real world scenario and Worked examples tabs. */
function extrasFromTabs(topic: NumberedTopic, tabs: SheetTab[]): OwnerLessonExtras {
  const recall: RecallQuestion[] = [];
  body(tabs, "Recall").forEach((row, index) => {
    const prompt = cell(row, 0);
    const accepted = splitList(cell(row, 1).replace(/,/g, "|"));
    const explanation = cell(row, 2);
    if (!prompt || accepted.length === 0) return;
    recall.push({
      id: `recall-owner-${topic.topicId}-${index + 1}`,
      topicId: topic.topicId,
      prompt,
      acceptedConcepts: accepted,
      explanation,
    });
  });

  const teachRows = body(tabs, "Teach back");
  const teachPrompt = cell(teachRows[0], 0);
  const expectedPoints = teachRows.map((row) => cell(row, 1)).filter(Boolean);
  const teachBack = teachPrompt || expectedPoints.length ? { prompt: teachPrompt, expectedPoints } : undefined;

  const scenarioRow = body(tabs, "Real world scenario")[0];
  const situation = cell(scenarioRow, 1);
  const decisionPrompt = cell(scenarioRow, 2);
  const scenario: RealWorldScenario | undefined =
    situation && decisionPrompt
      ? {
          id: `scenario-owner-${topic.topicId}`,
          topicId: topic.topicId,
          title: cell(scenarioRow, 0) || topic.title,
          situation,
          decisionPrompt,
          expectedConcepts: splitList(cell(scenarioRow, 3).replace(/,/g, "|")),
          guidance: cell(scenarioRow, 4),
        }
      : undefined;

  const workedExamples: WorkedExample[] = [];
  for (const row of body(tabs, "Worked examples")) {
    const title = cell(row, 0);
    let current = workedExamples[workedExamples.length - 1];
    if (title && (!current || key(current.title) !== key(title))) {
      workedExamples.push({
        id: `worked-owner-${topic.topicId}-${workedExamples.length + 1}`,
        title,
        topicIds: [topic.topicId],
        certificationId: topic.certificationId,
        question: "",
        steps: [],
        answer: "",
        tryIt: [],
      });
      current = workedExamples[workedExamples.length - 1];
    }
    if (!current) continue;
    if (!current.question) current.question = cell(row, 1);
    const label = cell(row, 2);
    const detail = cell(row, 3);
    if (label || detail) current.steps.push({ label: label || "Step", detail });
    if (!current.answer) current.answer = cell(row, 4);
    const tryPrompt = cell(row, 5);
    const tryAnswer = cell(row, 6);
    if (tryPrompt && tryAnswer) current.tryIt.push({ prompt: tryPrompt, answer: tryAnswer });
  }

  const labs = labsFromTabs(tabs);

  return {
    recall,
    ...(labs.length ? { labs } : {}),
    workedExamples: workedExamples.filter((example) => example.question && example.steps.length),
    ...(teachBack ? { teachBack } : {}),
    ...(scenario ? { scenario } : {}),
  };
}

/** Practice tab rows -> practice activities for this topic. */
export function practiceFromTabs(topic: NumberedTopic, tabs: SheetTab[]): PracticeActivity[] {
  const items: PracticeActivity[] = [];
  body(tabs, "Practice").forEach((row, index) => {
    const title = cell(row, 0);
    const prompt = cell(row, 1);
    const choices = [cell(row, 2), cell(row, 3), cell(row, 4), cell(row, 5)].filter(Boolean);
    const answerIndex = CORRECT_LETTERS.indexOf(cell(row, 6).toUpperCase());
    if (!prompt || choices.length < 2 || answerIndex < 0 || answerIndex >= choices.length) return;
    items.push({
      id: `practice-owner-${topic.topicId}-${index + 1}`,
      topicId: topic.topicId,
      title: title || "Practice",
      prompt,
      choices,
      answerIndex,
      explanation: cell(row, 7),
    });
  });
  return items;
}

/** Builds one topic's lesson from its workbook tabs, then gates it. */
export function ownerLessonFromTabs(topic: NumberedTopic, tabs: SheetTab[]): OwnerLessonResult {
  const head = body(tabs, "Lesson")[0];
  const intro = cell(head, 2);
  const whereYouMeetIt = cell(head, 3);

  const sections: DeepLesson["sections"] = [];
  for (const row of body(tabs, "Sections")) {
    const heading = cell(row, 0);
    const paragraph = cell(row, 1);
    const bullets = splitList(cell(row, 2));
    const current = sections[sections.length - 1];
    if (heading && (!current || key(current.heading) !== key(heading))) {
      sections.push({ heading, paragraphs: [] });
    }
    const target = sections[sections.length - 1];
    if (!target) continue;
    if (paragraph) target.paragraphs.push(paragraph);
    if (bullets.length) target.bullets = [...(target.bullets ?? []), ...bullets];
  }

  if (!intro || sections.length === 0) {
    return {
      lesson: null,
      sources: [],
      practice: [],
      extras: EMPTY_EXTRAS,
      error: "the Lesson or Sections tab is empty",
    };
  }

  const keyIdeas = body(tabs, "Key ideas")
    .map((row) => cell(row, 0))
    .filter(Boolean);

  const walkRows = body(tabs, "Walkthrough");
  const walkHead = walkRows[0];
  const steps = walkRows
    .map((row) => ({ label: cell(row, 2), detail: cell(row, 3) }))
    .filter((step) => step.label || step.detail);

  const referenceRows: LessonReferenceRow[] = body(tabs, "Reference")
    .map((row) => ({ term: cell(row, 1), detail: cell(row, 2) }))
    .filter((row) => row.term && row.detail);
  const referenceHeading = cell(body(tabs, "Reference")[0], 0) || "Quick reference";

  const misconceptions = body(tabs, "Misconceptions")
    .map((row) => ({ claim: cell(row, 0), correction: cell(row, 1) }))
    .filter((row) => row.claim && row.correction);

  const examTraps = body(tabs, "Exam traps")
    .map((row) => cell(row, 0))
    .filter(Boolean);

  const checkYourself: LessonCheck[] = body(tabs, "Check yourself")
    .map((row) => ({ question: cell(row, 0), answer: cell(row, 1) }))
    .filter((row) => row.question && row.answer);

  const plainRows = body(tabs, "Plain words");
  const plainIntro = cell(plainRows[0], 0);
  const wordList = plainRows
    .map((row) => ({ term: cell(row, 1), plain: cell(row, 2) }))
    .filter((row) => row.term && row.plain);

  const minutes = Number.parseInt(cell(head, 1), 10);
  const lesson: DeepLesson = {
    topicId: topic.topicId,
    readingMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : 12,
    intro,
    whereYouMeetIt: whereYouMeetIt || intro,
    sections,
    ...(keyIdeas.length || steps.length || referenceRows.length || misconceptions.length ||
    examTraps.length || checkYourself.length
      ? {
          depth: {
            keyIdeas,
            walkthrough: {
              title: cell(walkHead, 0) || "Worked example",
              scenario: cell(walkHead, 1),
              steps,
              outcome: walkRows.map((row) => cell(row, 4)).find(Boolean) ?? "",
            },
            reference: { heading: referenceHeading, rows: referenceRows },
            misconceptions,
            examTraps,
            checkYourself,
          },
        }
      : {}),
    ...(plainIntro && wordList.length ? { plain: { plainIntro, wordList } } : {}),
  };

  const sources: Resource[] = body(tabs, "Sources")
    .map((row, index): Resource | null => {
      const label = cell(row, 0);
      const url = cell(row, 1);
      const kind: Resource["kind"] = key(cell(row, 2)) === "video" ? "video" : "article";
      if (!url || !/^https?:\/\//i.test(url)) return null;
      return {
        id: `resource-owner-${topic.topicId}-${index + 1}`,
        title: label || url,
        provider: hostOf(url),
        url,
        topicIds: [topic.topicId],
        certificationId: topic.certificationId,
        kind,
        difficulty: "standard",
        access: "free",
        lastVerified: new Date().toISOString().slice(0, 10),
        status: "verified",
      };
    })
    .filter((item): item is Resource => item !== null);

  const practice = practiceFromTabs(topic, tabs);
  const extras = extrasFromTabs(topic, tabs);
  const rejectReasons = deepLessonIssues(lesson);
  if (rejectReasons.length) return { lesson, sources, practice, extras, rejectReasons };
  return { lesson, sources, practice, extras };
}
