/**
 * Optional scan-tool practice attached to lessons.
 *
 * This is extra practice only. Nothing here is graded, nothing here is drawn
 * into a section quiz, a stage exam or a mastery check, and skipping it never
 * blocks a section. It simply points a learner at the virtual OBD-II scanner
 * with a vehicle that matches what the lesson just taught, plus a few things
 * worth looking at while they are plugged in.
 */
import { obdScenarios, type ObdScenario } from "@/data/auto/obd";

export interface ObdLessonPractice {
  scenario: ObdScenario;
  /** What to look at on the tool. Guidance, never marked. */
  prompts: string[];
}

interface Rule {
  scenarioId: string;
  /** Matched against the lowercased section id and title. */
  keywords: string[];
  prompts: string[];
}

/** First matching rule wins, so the more specific rules come first. */
const RULES: Rule[] = [
  {
    scenarioId: "misfire-coil",
    keywords: ["misfire", "ignition", "spark", "coil"],
    prompts: [
      "Read the stored code and note which cylinder it names before you look at anything else.",
      "Watch the misfire counters at idle, then at 2500 rpm, and see whether the count follows engine speed.",
      "Check the freeze frame: what was the engine doing the moment the fault was recorded?",
    ],
  },
  {
    scenarioId: "thermostat",
    keywords: ["cooling", "coolant", "thermostat", "overheat", "heat management", "lubrication"],
    prompts: [
      "Follow coolant temperature from a cold start and decide whether the engine reaches normal operating temperature.",
      "Compare the temperature reading against the range the lesson gave for a warmed-up engine.",
      "Ask what a temperature that never climbs does to fuel trim and fuel economy.",
    ],
  },
  {
    scenarioId: "evap",
    keywords: ["evap", "emission", "fuel tank", "exhaust", "catalyst", "vapor"],
    prompts: [
      "Check readiness monitors before you touch the codes, and note which ones have not run.",
      "Read the code meaning, then list the cheapest check you would make first.",
      "Decide what clearing codes would cost you here, and why you would not clear them yet.",
    ],
  },
  {
    scenarioId: "vacuum-leak",
    keywords: [
      "fuel delivery",
      "fuel system",
      "intake",
      "air induction",
      "engine performance",
      "idle",
      "fuel trim",
      "engine mechanical",
    ],
    prompts: [
      "Compare short term and long term fuel trim at idle against the same readings at 2500 rpm.",
      "Decide what unmetered air does to the trims, and why the fault fades once the engine is loaded.",
      "Work out which reading you would use to confirm the leak before you buy a part.",
    ],
  },
  {
    scenarioId: "healthy",
    keywords: ["diagnostic", "scan", "sensor", "electronic", "computer", "circuit", "verification"],
    prompts: [
      "Learn the shape of a healthy stream: fuel trims near zero and the upstream oxygen sensor swinging across 0.45 V.",
      "Note what load does as you rev, so an abnormal reading stands out later.",
      "Write down two readings you would always check first on any vehicle.",
    ],
  },
];

/** The optional scan-tool practice for a section, when one fits. */
export function obdPracticeForTopic(topicId: string, topicTitle: string): ObdLessonPractice | null {
  const haystack = `${topicId} ${topicTitle}`.toLowerCase();
  const rule = RULES.find((candidate) => candidate.keywords.some((word) => haystack.includes(word)));
  if (!rule) return null;
  const scenario = obdScenarios.find((item) => item.id === rule.scenarioId);
  if (!scenario) return null;
  return { scenario, prompts: rule.prompts };
}
