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

/**
 * The learning experience is deliberately domain-neutral. IT PATH and AUTO
 * PATH use the same stages, labels and mastery UX; the active domain supplies
 * the curriculum and examples, not a forked learning interface.
 */
const SHARED: LearningExperienceLanguage = {
  see: "See It", practice: "Practice It", prove: "Prove It", reference: "Keep Handy",
  recall: "Recall", recallPrompt: "Answer from memory", teachBack: "Teach Back",
  scenario: "Real-World Scenario", scenarioAnswer: "Your decision and reasoning",
  scenarioAction: "Evaluate reasoning", quiz: "Section quiz", quizAction: "Take the section quiz",
  progress: "Learning progress", mastery: "Overall mastery",
};

export function learningExperienceLanguage(): LearningExperienceLanguage {
  return SHARED;
}
