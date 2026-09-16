/**
 * Plain-language guides for each learning measure.
 *
 * Nothing here is scored: it explains what feeds a measure and what work
 * actually moves it, so every percentage on the site is traceable.
 */
export type MeasureKey =
  | "understanding"
  | "recall"
  | "application"
  | "practicalAbility"
  | "troubleshooting"
  | "retention";

export interface MeasureGuide {
  key: MeasureKey;
  slug: string;
  label: string;
  meaning: string;
  counts: string[];
  raise: Array<{ text: string; to: string; params?: Record<string, string> }>;
  note: string;
}

export const measureGuides: MeasureGuide[] = [
  {
    key: "understanding",
    slug: "understanding",
    label: "Understanding",
    meaning: "You can say what something means and why it works that way, in your own words.",
    counts: [
      "Teach Back answers, where you explain the idea back without notes",
      "Written answers marked on meaning rather than wording",
      "Explain style assignments in a section",
    ],
    raise: [
      { text: "Read a section, then write the Teach Back answer", to: "/my-path" },
      { text: "Work through the lessons in order", to: "/journey" },
      { text: "Ask the tutor to check your explanation", to: "/ai-tutor" },
    ],
    note: "Short answers that repeat the lesson wording score lower than an answer in your own words, so write it the way you would say it out loud.",
  },
  {
    key: "recall",
    slug: "recall",
    label: "Recall",
    meaning: "You can get the fact back out of memory right now, with nothing in front of you.",
    counts: [
      "Recall questions at the bottom of each lesson",
      "Recall style assignments",
      "Your latest answer on each item, not your best one",
    ],
    raise: [
      { text: "Answer the recall questions on your current section", to: "/my-path" },
      { text: "Run a short quiz on what you have covered", to: "/quiz-me" },
      { text: "Clear anything sitting in Review", to: "/review" },
    ],
    note: "Because only your latest answer counts, an old correct answer will not cover a later miss. Answering again is what fixes it.",
  },
  {
    key: "application",
    slug: "application",
    label: "Application",
    meaning: "You pick the right thing to do in a given situation, not just describe the idea.",
    counts: [
      "Practice decisions inside each section",
      "Real world scenarios at the end of a lesson",
      "Compare, design and exam simulation assignments",
    ],
    raise: [
      { text: "Do the practice questions in your current section", to: "/practice" },
      { text: "Work a real world scenario", to: "/career-mode" },
      { text: "Try a full practice exam", to: "/exam" },
    ],
    note: "This one moves when you choose between options that are all plausible, which is why the scenarios rarely have an obvious answer.",
  },
  {
    key: "practicalAbility",
    slug: "practical-ability",
    label: "Practical ability",
    meaning: "You do the work yourself at a machine or a terminal, rather than reading about it.",
    counts: [
      "Lab attempts, scored out of the lab maximum",
      "Terminal scenarios you submit",
      "Build, configure, command challenge and capstone assignments",
    ],
    raise: [
      { text: "Run a lab end to end", to: "/labs" },
      { text: "Open the command line and finish a scenario", to: "/command-line" },
      { text: "Take a build or configure assignment", to: "/study-plan" },
    ],
    note: "Reading a lab does not count. The score comes from what you submit, so finish the run even if it takes two goes.",
  },
  {
    key: "troubleshooting",
    slug: "troubleshooting",
    label: "Troubleshooting",
    meaning: "You find the cause of a fault and deal with it, working from symptoms back to the source.",
    counts: [
      "Incident attempts and the decisions inside them",
      "Support tickets you resolve",
      "Incident and troubleshoot assignments",
    ],
    raise: [
      { text: "Work an incident from the fault list", to: "/troubleshoot" },
      { text: "Take a support ticket in career mode", to: "/career-mode" },
      { text: "Redo an incident you got partly right", to: "/review" },
    ],
    note: "The scenarios are written from the documented failure modes in the curriculum, so they are authored rather than live systems. The score on them is entirely yours.",
  },
  {
    key: "retention",
    slug: "retention",
    label: "Retention",
    meaning: "The same work is still right days and weeks after you first got it right.",
    counts: [
      "A second correct answer on an item you already had right",
      "How wide the gap was between those two correct answers",
      "Same day repeats count very little; a week or three weeks counts fully",
    ],
    raise: [
      { text: "Come back and clear your due reviews", to: "/review" },
      { text: "Take the daily challenge", to: "/daily-challenge" },
      { text: "Retake a section quiz you passed a while ago", to: "/journey" },
    ],
    note: "You cannot raise this in one sitting. It only moves as time passes and the same answers keep holding up, so it sits outside your section score rather than being counted twice.",
  },
];

export function measureGuideByKey(key: MeasureKey): MeasureGuide | undefined {
  return measureGuides.find((guide) => guide.key === key);
}

export function measureGuideBySlug(slug: string): MeasureGuide | undefined {
  return measureGuides.find((guide) => guide.slug === slug);
}

export function measureSlug(key: MeasureKey): string {
  return measureGuideByKey(key)?.slug ?? key;
}
