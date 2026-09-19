/**
 * The visible journey: the full path grouped into four stages, with each
 * topic's real learning state attached at render time.
 *
 * This file holds only static curriculum structure. States come from the
 * intelligence layer, so an untouched topic stays honestly "not started".
 * The static topic list already contains every topic exactly once, so it is
 * the single source here; nothing else is merged in.
 */
import { topics as coreTopics } from "@/data/static-content";
import { domainOverlay } from "@/data/domain-overlay";

export interface JourneyTopic {
  id: string;
  title: string;
  summary: string;
  minutes: number;
}

export interface JourneyPhase {
  title: string;
  stage: string;
  blurb: string;
  topics: JourneyTopic[];
}

const PHASE_DEFS: Array<{ from: number; to: number; title: string; stage: string; blurb: string }> = [
  {
    from: 1,
    to: 7,
    title: "Foundations and CompTIA A+",
    stage: "Stage 1",
    blurb: "How computers actually work, and the A+ hardware, software and troubleshooting material.",
  },
  {
    from: 8,
    to: 13,
    title: "Networking and Security",
    stage: "Stage 2",
    blurb: "Networks end to end, then the Network+ and Security+ core: protocols, hardening and threats.",
  },
  {
    from: 14,
    to: 19,
    title: "Linux, Servers and Cloud",
    stage: "Stage 3",
    blurb: "The command line, servers, containers and the cloud platforms most infrastructure runs on.",
  },
  {
    from: 20,
    to: 24,
    title: "Advanced Security and Career",
    stage: "Stage 4",
    blurb: "Deeper security work: attack and defence, tooling, and putting it together for employers.",
  },
];

export const journeyPhases: JourneyPhase[] = PHASE_DEFS.map((phase) => ({
  title: phase.title,
  stage: phase.stage,
  blurb: phase.blurb,
  topics: coreTopics
    .filter((topic) => topic.month >= phase.from && topic.month <= phase.to)
    .map((topic) => ({
      id: topic.id,
      title: topic.title,
      summary: topic.summary,
      minutes: topic.estimatedMinutes,
    })),
}));
