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

function asJourneyTopic(topic: (typeof coreTopics)[number]): JourneyTopic {
  return { id: topic.id, title: topic.title, summary: topic.summary, minutes: topic.estimatedMinutes };
}

/**
 * The authored IT path keeps its four hand-written stages. Any other subject
 * names its own stages after the qualifications its own package declares, so
 * the journey never reads like someone else's course.
 */
function authoredPhases(): JourneyPhase[] {
  return PHASE_DEFS.map((phase) => ({
    title: phase.title,
    stage: phase.stage,
    blurb: phase.blurb,
    topics: coreTopics.filter((topic) => topic.month >= phase.from && topic.month <= phase.to).map(asJourneyTopic),
  }));
}

function overlayPhases(overlay: NonNullable<typeof domainOverlay>): JourneyPhase[] {
  const groups = overlay.certifications
    .map((certification) => ({
      certification,
      topics: coreTopics.filter((topic) => topic.certificationId === certification.id),
    }))
    .filter((group) => group.topics.length > 0)
    .sort((a, b) => Math.min(...a.topics.map((t) => t.month)) - Math.min(...b.topics.map((t) => t.month)));

  const grouped = new Set(groups.flatMap((group) => group.topics.map((topic) => topic.id)));
  const remaining = coreTopics.filter((topic) => !grouped.has(topic.id));

  const phases: JourneyPhase[] = groups.map((group, index) => ({
    title: group.certification.title,
    stage: `Stage ${index + 1}`,
    blurb: group.certification.description ?? "The sections that make up this part of the course.",
    topics: group.topics.map(asJourneyTopic),
  }));

  if (remaining.length > 0) {
    phases.push({
      title: "Further study",
      stage: `Stage ${phases.length + 1}`,
      blurb: "The remaining sections of this course.",
      topics: remaining.map(asJourneyTopic),
    });
  }

  return phases.length > 0 ? phases : authoredPhases();
}

export const journeyPhases: JourneyPhase[] = domainOverlay ? overlayPhases(domainOverlay) : authoredPhases();
