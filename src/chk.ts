import { getSectionQuizQuestions } from "@/data/topic-quizzes";
const qs = getSectionQuizQuestions("topic-wireless-standards-and-soho-networks", 0).slice(0, 5);
for (const q of qs) console.log("\nQ:", q.prompt, "\n", (q.options ?? []).map((o, i) => `${i}. ${o}`).join("\n "), "\n ans:", (q as any).correctIndexes ?? (q as any).correctIndex);
