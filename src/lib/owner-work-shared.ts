/**
 * Owner "recall" workbooks: one tabbed spreadsheet per topic holding the
 * work a learner does after reading — recall prompts, the teach-back brief,
 * the application scenario, and the troubleshooting lists.
 *
 * The workbooks live in the "itpath recall" and "autopath recall" folders and
 * are numbered exactly like the quiz and lesson spreadsheets: the leading
 * number in the filename picks the topic, 1 being the first topic of that
 * course in curriculum order.
 *
 * Anything a workbook supplies replaces the built-in version for that topic
 * completely. An empty tab changes nothing.
 */
import type { RealWorldScenario, RecallQuestion } from "@/lib/app-data/types";
import { body, cell, splitList, type SheetTab } from "@/lib/owner-lessons-shared";
import type { NumberedTopic } from "@/lib/owner-questions-shared";

export interface OwnerTroubleshooting {
  commonProblems: string[];
  howItFails: string[];
  steps: string[];
}

export interface OwnerTopicWork {
  recall: RecallQuestion[];
  teachBack?: { prompt: string; expectedPoints: string[] };
  scenario?: RealWorldScenario;
  troubleshooting?: OwnerTroubleshooting;
}

export const WORK_TABS = ["Recall", "Teach back", "Application", "Troubleshooting"] as const;

/** Headers of each tab, in column order. The template workbook uses these. */
export const WORK_TAB_HEADERS: Record<string, string[]> = {
  Recall: ["Prompt", "Accepted concepts", "Explanation"],
  "Teach back": ["Prompt", "Expected point"],
  Application: ["Title", "Situation", "Decision prompt", "Expected concepts", "Guidance"],
  Troubleshooting: ["Common problem", "How it fails", "Troubleshooting step"],
};

/** Builds one topic's work from its workbook tabs. */
export function ownerWorkFromTabs(topic: NumberedTopic, tabs: SheetTab[]): OwnerTopicWork {
  const recall: RecallQuestion[] = [];
  body(tabs, "Recall").forEach((row, index) => {
    const prompt = cell(row, 0);
    const accepted = splitList(cell(row, 1).replace(/,/g, "|"));
    if (!prompt || accepted.length === 0) return;
    recall.push({
      id: `recall-work-${topic.topicId}-${index + 1}`,
      topicId: topic.topicId,
      prompt,
      acceptedConcepts: accepted,
      explanation: cell(row, 2),
    });
  });

  const teachRows = body(tabs, "Teach back");
  const teachPrompt = cell(teachRows[0], 0);
  const expectedPoints = teachRows.map((row) => cell(row, 1)).filter(Boolean);
  const teachBack =
    teachPrompt || expectedPoints.length ? { prompt: teachPrompt, expectedPoints } : undefined;

  const applicationRow = body(tabs, "Application")[0];
  const situation = cell(applicationRow, 1);
  const decisionPrompt = cell(applicationRow, 2);
  const scenario: RealWorldScenario | undefined =
    situation && decisionPrompt
      ? {
          id: `scenario-work-${topic.topicId}`,
          topicId: topic.topicId,
          title: cell(applicationRow, 0) || topic.title,
          situation,
          decisionPrompt,
          expectedConcepts: splitList(cell(applicationRow, 3).replace(/,/g, "|")),
          guidance: cell(applicationRow, 4),
        }
      : undefined;

  const troubleRows = body(tabs, "Troubleshooting");
  const commonProblems = troubleRows.map((row) => cell(row, 0)).filter(Boolean);
  const howItFails = troubleRows.map((row) => cell(row, 1)).filter(Boolean);
  const steps = troubleRows.map((row) => cell(row, 2)).filter(Boolean);
  const troubleshooting =
    commonProblems.length || howItFails.length || steps.length
      ? { commonProblems, howItFails, steps }
      : undefined;

  return {
    recall,
    ...(teachBack ? { teachBack } : {}),
    ...(scenario ? { scenario } : {}),
    ...(troubleshooting ? { troubleshooting } : {}),
  };
}
