/**
 * Permanently removes every AI-bank question for one topic, so the generated
 * pool can no longer serve it from any surface.
 *
 * Run: bun run scripts/purge-bank-topic.ts <topicId>
 */
import { readFileSync, writeFileSync } from "node:fs";

import { aiQuestions } from "../src/data/ai-question-bank";

const topicId = process.argv[2];
if (!topicId) throw new Error("usage: purge-bank-topic.ts <topicId>");

const kept = aiQuestions.filter((question) => question.topicId !== topicId);

const source = readFileSync("src/data/ai-question-bank.ts", "utf8");
const marker = "export const aiQuestions";
const header = source.slice(0, source.indexOf(marker));

writeFileSync(
  "src/data/ai-question-bank.ts",
  `${header}export const aiQuestions: Question[] = ${JSON.stringify(kept, null, 2)};\n`,
);

console.log(`removed ${aiQuestions.length - kept.length} question(s) for ${topicId}, kept ${kept.length}`);
