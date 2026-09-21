/**
 * Identification labs.
 *
 * The hardware one is the explorer with the labels taken off: the parts are
 * still numbered, and you have to say what each one is and what it does. Other
 * sections work the same way with their own material, so the lab is always
 * "name it and explain it" rather than ticking boxes.
 *
 * A fresh set is chosen on every attempt, so no run repeats the last one.
 */
import { hardwareComponents } from "@/data/hardware-explorer";
import { categoryFor } from "@/data/lab-generator";
import type { Lab, Lesson, Topic } from "@/lib/app-data/types";

export const HARDWARE_TOPIC_ID = "topic-computer-hardware-basics";

export interface IdentificationItem {
  id: string;
  /** Marker number shown on the diagram or in the list. */
  number: number;
  /** Where it sits on the photo, when there is one. */
  x?: number;
  y?: number;
  /** What the learner is shown instead of the name. */
  clue: string;
  /** The name they have to produce. */
  name: string;
  /** Ideas their description of the job has to express. */
  functionConcepts: string[];
  answerFunction: string;
}

export interface IdentificationSet {
  /** Key into the hardware photo set, when this lab uses a diagram. */
  photoKey?: string;
  heading: string;
  items: IdentificationItem[];
}

export const identificationLabId = (topicId: string) => `lab-${topicId.replace(/^topic-/, "")}-identify`;

export function isIdentificationLab(labId: string): boolean {
  return labId.endsWith("-identify");
}

function pick<T>(items: readonly T[], round: number, count: number): T[] {
  if (items.length <= count) return [...items];
  const start = (round * count) % items.length;
  const out: T[] = [];
  for (let index = 0; index < count; index += 1) {
    out.push(items[(start + index) % items.length] as T);
  }
  return out;
}

/** The set for one attempt. The round number moves it on each time. */
export function identificationSet(
  topicId: string,
  round: number,
  lesson?: { keyTerms?: { term: string; meaning: string }[] },
): IdentificationSet | undefined {
  if (topicId === HARDWARE_TOPIC_ID) {
    const component = hardwareComponents[round % hardwareComponents.length];
    if (!component) return undefined;
    return {
      photoKey: component.id,
      heading: `${component.name}: name every numbered part`,
      items: component.parts.map((part, index) => ({
        id: part.id,
        number: index + 1,
        x: part.x,
        y: part.y,
        clue: "",
        name: part.name,
        functionConcepts: [part.whatItDoes],
        answerFunction: part.whatItDoes,
      })),
    };
  }

  const terms = lesson?.keyTerms ?? [];
  if (terms.length < 3) return undefined;
  const chosen = pick(terms, round, Math.min(5, terms.length));
  return {
    heading: "Name each one from its description, then say what it does",
    items: chosen.map((term, index) => ({
      id: `${topicId}-term-${term.term.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      number: index + 1,
      clue: term.meaning,
      name: term.term,
      functionConcepts: [term.meaning],
      answerFunction: term.meaning,
    })),
  };
}

/** One identification lab per section that has material for it. */
export function buildIdentificationLabs(topicList: Topic[], lessonList: Lesson[]): Lab[] {
  const out: Lab[] = [];
  for (const topic of topicList) {
    const lesson = lessonList.find((item) => item.topicId === topic.id);
    const set = identificationSet(topic.id, 0, lesson);
    if (!set) continue;
    const hardware = topic.id === HARDWARE_TOPIC_ID;
    out.push({
      id: identificationLabId(topic.id),
      topicId: topic.id,
      title: hardware ? "Identify the hardware, no labels" : `${topic.title}: identify and explain`,
      category: hardware ? "hardware" : categoryFor(topic),
      objective: hardware
        ? "Name every numbered part on a blank diagram and say what each one does."
        : `Name each key part of ${topic.title} from its description and explain what it does.`,
      prerequisites: [topic.title],
      difficulty: topic.difficulty,
      estimatedMinutes: 20,
      environment: hardware
        ? "A blank version of the hardware explorer. The parts are numbered, the labels are gone, and you type what each one is."
        : "A written identification round built from this section's own material.",
      instructions: [
        "Work from memory. Close the lesson before you start.",
        "For each number, type the name of the part.",
        "Then write, in your own words, what that part actually does.",
        "Submit to see which ones held up and which need another look.",
      ],
      expectedResult: "Every numbered item named correctly, with a description of its job in your own words.",
      checklist: set.items.map((item) => ({
        id: item.id,
        label: `Item ${item.number} named and explained`,
        points: Math.round(100 / set.items.length),
      })),
      reflectionPrompt: "Which one did you have to think hardest about, and what would fix that gap?",
      masteryScore: 80,
    });
  }
  return out;
}
