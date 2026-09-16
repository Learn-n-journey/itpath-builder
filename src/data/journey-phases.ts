/**
 * The visible journey: the full 24-month path grouped into phases, with each
 * topic's real learning state attached at render time.
 *
 * This file holds only static curriculum structure. States come from the
 * intelligence layer, so an untouched topic stays honestly "not started".
 */
import { expansionSeeds } from "@/data/curriculum";
import { topics as coreTopics } from "@/data/static-content";

export interface JourneyTopic {
  id: string;
  title: string;
  summary: string;
  minutes: number;
}

export interface JourneyPhase {
  title: string;
  months: string;
  blurb: string;
  topics: JourneyTopic[];
}

const PHASE_DEFS: Array<{ minMonth: number; maxMonth: number; title: string; months: string; blurb: string }> = [
  {
    minMonth: 1,
    maxMonth: 7,
    title: "Foundations and CompTIA A+",
    months: "Months 1 to 7",
    blurb: "How computers actually work, and the A+ hardware, software and troubleshooting material.",
  },
  {
    minMonth: 8,
    maxMonth: 13,
    title: "Networking and Security",
    months: "Months 8 to 13",
    blurb: "Networks end to end, then the Network+ and Security+ core: protocols, hardening and threats.",
  },
  {
    minMonth: 14,
    maxMonth: 19,
    title: "Linux, Servers and Cloud",
    months: "Months 14 to 19",
    blurb: "The command line, servers, containers and the cloud platforms most infrastructure runs on.",
  },
  {
    minMonth: 20,
    maxMonth: 24,
    title: "Advanced Security and Career",
    months: "Months 20 to 24",
    blurb: "Deeper security work: attack and defence, tooling, and putting it together for employers.",
  },
];

// The seed files repeat some entries; keep the first copy of each topic id.
const dedupedExpansion = expansionSeeds.filter(
  (seed, index) => expansionSeeds.findIndex((other) => other.slug === seed.slug) === index,
);

export const journeyPhases: JourneyPhase[] = PHASE_DEFS.map((phase) => ({
  title: phase.title,
  months: phase.months,
  blurb: phase.blurb,
  topics: [
    // Core month-1 foundations sit at the very start of the journey.
    ...coreTopics
      .filter((topic) => topic.month >= phase.minMonth && topic.month <= phase.maxMonth)
      .map((topic) => ({
        id: topic.id,
        title: topic.title,
        summary: topic.summary,
        minutes: topic.estimatedMinutes,
      })),
    ...dedupedExpansion
      .filter((seed) => seed.month >= phase.minMonth && seed.month <= phase.maxMonth)
      .map((seed) => ({
        id: `topic-${seed.slug}`,
        title: seed.title,
        summary: seed.summary,
        minutes: seed.minutes,
      })),
  ],
}));
