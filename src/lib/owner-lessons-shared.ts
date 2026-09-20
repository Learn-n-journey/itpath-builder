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
import type { Resource } from "@/lib/app-data/types";
import { deepLessonIssues } from "@/lib/lesson-quality";
import type { NumberedTopic } from "@/lib/owner-questions-shared";

/** A worksheet as read from the workbook: tab name plus its rows of cells. */
export interface SheetTab {
  name: string;
  rows: string[][];
}

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
};

const key = (value: string) => value.trim().toLowerCase();

function body(tabs: SheetTab[], name: string): string[][] {
  const tab = tabs.find((item) => key(item.name) === key(name));
  if (!tab) return [];
  return tab.rows
    .slice(1)
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some(Boolean));
}

const cell = (row: string[] | undefined, index: number): string => (row?.[index] ?? "").trim();

function splitList(value: string): string[] {
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
  rejectReasons?: string[];
  error?: string;
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
    return { lesson: null, sources: [], error: "the Lesson or Sections tab is empty" };
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

  const rejectReasons = deepLessonIssues(lesson);
  if (rejectReasons.length) return { lesson, sources, rejectReasons };
  return { lesson, sources };
}
