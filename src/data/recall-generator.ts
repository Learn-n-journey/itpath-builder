import { lessons } from "@/data/static-content";
import { getLearningModule } from "@/data/learning-content";
import type { RecallQuestion } from "@/lib/app-data/types";

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "that", "this", "it", "is", "are",
  "can", "may", "be", "by", "as", "its", "their", "from", "into", "when", "which", "you", "your", "not",
  "but", "also", "than", "then", "each", "any", "all", "one", "two", "does", "do", "so", "if", "at", "no",
]);

/** Picks the words worth crediting in a written answer, so marking stays about meaning. */
function conceptsFrom(text: string, limit = 4): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
  const seen: string[] = [];
  for (const word of words) {
    if (!seen.includes(word)) seen.push(word);
    if (seen.length >= limit) break;
  }
  return seen;
}

/**
 * Extra recall prompts built from the topic's own lesson content, so a learner who has
 * already answered the authored questions well still gets fresh ones on the next visit.
 */
export function getGeneratedRecallQuestions(topicId: string): RecallQuestion[] {
  const lesson = lessons.find((item) => item.topicId === topicId);
  const module = getLearningModule(topicId);
  const out: RecallQuestion[] = [];
  const push = (key: string, prompt: string, explanation: string) => {
    const concepts = conceptsFrom(explanation);
    if (concepts.length < 2) return;
    out.push({ id: `recall-gen-${topicId}-${key}`, topicId, prompt, acceptedConcepts: concepts, explanation });
  };

  lesson?.keyTerms.forEach((term, index) => {
    push(`term-${index}`, `In your own words, what is ${term.term} and what does it do here?`, term.meaning);
  });
  lesson?.commonMisconceptions.forEach((item, index) => {
    push(`myth-${index}`, `Someone tells you: "${item}" How would you set that straight?`, item);
  });
  module?.commonProblems.forEach((item, index) => {
    push(`problem-${index}`, `How would you recognise a ${item.toLowerCase()} problem in this area?`, item);
  });
  module?.troubleshooting.forEach((item, index) => {
    push(`fix-${index}`, `Describe one useful troubleshooting step for this topic and why it helps.`, item);
  });

  return out;
}
