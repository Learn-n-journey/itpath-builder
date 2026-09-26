import { activeDomainKey } from "@/domain/active";

export interface LearningExperienceLanguage {
  see: string;
  practice: string;
  prove: string;
  reference: string;
  recall: string;
  recallPrompt: string;
  teachBack: string;
  scenario: string;
  scenarioAnswer: string;
  scenarioAction: string;
  quiz: string;
  quizAction: string;
  progress: string;
  mastery: string;
}

const DEFAULT: LearningExperienceLanguage = {
  see: "See It", practice: "Practice It", prove: "Prove It", reference: "Keep Handy",
  recall: "Recall", recallPrompt: "Answer from memory", teachBack: "Teach Back",
  scenario: "Real-World Scenario", scenarioAnswer: "Your decision and reasoning",
  scenarioAction: "Evaluate reasoning", quiz: "Section quiz", quizAction: "Take the section quiz",
  progress: "Learning progress", mastery: "Overall mastery",
};

const AUTO: LearningExperienceLanguage = {
  see: "See It in the Shop", practice: "Inspect & Test", prove: "Diagnose & Verify", reference: "Service Reference",
  recall: "Identify", recallPrompt: "Identify it from memory", teachBack: "Explain the System",
  scenario: "Diagnostic Case", scenarioAnswer: "Your diagnosis, test plan, and reasoning",
  scenarioAction: "Evaluate diagnosis", quiz: "Shop knowledge check", quizAction: "Take the shop knowledge check",
  progress: "Shop progress", mastery: "Diagnostic mastery",
};

export function learningExperienceLanguage(): LearningExperienceLanguage {
  return activeDomainKey.split("@")[0] === "auto-repair" ? AUTO : DEFAULT;
}
