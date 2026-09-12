import { generatedQuestions } from "@/data/question-bank";
const byCert: Record<string, number> = {};
for (const q of generatedQuestions) byCert[q.certificationId] = (byCert[q.certificationId] ?? 0) + 1;
console.log(generatedQuestions.length, byCert);
