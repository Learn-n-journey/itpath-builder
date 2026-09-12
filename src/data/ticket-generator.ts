/**
 * Builds a Career Mode ticket for every curriculum topic using that topic's own
 * module content. Each ticket has one correct diagnosis drawn from the topic's
 * documented failure modes, distractors drawn from neighbouring topics, correct
 * resolutions taken from the documented troubleshooting order, and a root cause
 * that is only released after the learner submits their own conclusion.
 */
import { learningModules } from "@/data/learning-content";
import type {
  CareerTrack,
  Lesson,
  Ticket,
  TicketOption,
  TicketPriority,
  Topic,
} from "@/lib/app-data/types";

const TRACK_BY_CERT: Record<string, CareerTrack> = {
  "cert-comptia-a-plus": "help_desk",
  "cert-comptia-network-plus": "network_technician",
  "cert-comptia-security-plus": "junior_security_analyst",
  "cert-comptia-linux-plus": "junior_sysadmin",
  "cert-comptia-server-plus": "junior_sysadmin",
  "cert-comptia-cloud-plus": "junior_sysadmin",
  "cert-comptia-cysa-plus": "junior_security_analyst",
  "cert-comptia-pentest-plus": "junior_security_analyst",
  "cert-comptia-securityx": "junior_security_analyst",
};

const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

const REQUESTERS = [
  "Dana Whitfield, Accounts Payable",
  "Marcus Ellery, Field Sales",
  "Priya Raman, Design Studio",
  "Tom Okafor, Warehouse Operations",
  "Helen Struthers, Finance",
  "Jae-won Park, Customer Support",
  "Laura Benitez, Clinical Records",
  "Owen Fitzgerald, Facilities",
];

function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function hash(value: string): number {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) total += value.charCodeAt(index) * (index + 3);
  return total;
}

export function buildTopicTickets(topics: Topic[], lessons: Lesson[]): Ticket[] {
  const out: Ticket[] = [];

  topics.forEach((topic, topicIndex) => {
    const learningModule = learningModules.find((item) => item.topicId === topic.id);
    if (!learningModule) return;
    const problems = learningModule.commonProblems;
    const steps = learningModule.troubleshooting;
    if (problems.length < 2 || steps.length < 2) return;

    const lesson = lessons.find((item) => item.topicId === topic.id);
    const slug = topic.id.replace(/^topic-/, "");
    const seed = hash(topic.id);
    const track = TRACK_BY_CERT[topic.certificationId] ?? "help_desk";
    const primary = problems[0] as string;
    const failure = learningModule.howItFails[0] ?? sentence(primary);
    const where = learningModule.whereYouSeeIt[0] ?? topic.summary;
    const practical = learningModule.practicalKnowledge;

    const actions = [
      {
        id: `act-${slug}-scope`,
        label: "Confirm the symptom, when it started and who else is affected",
        finding: `One user reports the problem since this morning; a colleague on the same setup is unaffected. ${sentence(failure)}`,
        informative: true,
      },
      ...steps.slice(0, 3).map((step, index) => ({
        id: `act-${slug}-step-${index + 1}`,
        label: sentence(step).replace(/\.$/, ""),
        finding:
          index === 0
            ? `The check completes and the results point back at ${lower(sentence(primary))}`
            : `Result recorded. Nothing here contradicts ${lower(sentence(primary))}`,
        informative: true,
      })),
      {
        id: `act-${slug}-noise-reboot`,
        label: "Reboot the device and see whether the problem clears",
        finding: "The device restarts and the symptom returns within minutes. No new evidence was gathered.",
        informative: false,
      },
      {
        id: `act-${slug}-noise-replace`,
        label: "Order a replacement device before finishing the investigation",
        finding: "Procurement accepts the request, but nothing observed so far justifies replacing equipment.",
        informative: false,
      },
      {
        id: `act-${slug}-context`,
        label: `Check how this is normally used here: ${lower(sentence(where)).replace(/\.$/, "")}`,
        finding: sentence(where),
        informative: true,
      },
    ];

    const keyActionIds = actions.filter((action) => action.informative).map((action) => action.id);

    const otherProblems = topics
      .filter((item) => item.id !== topic.id)
      .map((item) => learningModules.find((entry) => entry.topicId === item.id)?.commonProblems[0])
      .filter((value): value is string => Boolean(value));

    const distractors: TicketOption[] = [0, 1, 2]
      .map((offset) => otherProblems[(seed + offset * 17) % Math.max(otherProblems.length, 1)])
      .filter((value): value is string => Boolean(value))
      .filter((value, index, list) => list.indexOf(value) === index && value !== primary)
      .map((value, index) => ({
        id: `dx-${slug}-wrong-${index + 1}`,
        label: sentence(value),
        correct: false,
        hint: "Re-read the findings you collected: nothing you observed supports this cause.",
      }));

    const diagnoses: TicketOption[] = [
      { id: `dx-${slug}-correct`, label: sentence(primary), correct: true },
      ...distractors,
      ...(problems[1]
        ? [
            {
              id: `dx-${slug}-plausible`,
              label: sentence(problems[1] as string),
              correct: false,
              hint: "This is a real fault for this topic, but the evidence you gathered points somewhere more specific.",
            } satisfies TicketOption,
          ]
        : []),
    ];

    const resolutions: TicketOption[] = [
      ...steps.slice(0, 2).map((step, index) => ({
        id: `res-${slug}-${index + 1}`,
        label: sentence(step),
        correct: true,
      })),
      {
        id: `res-${slug}-practical`,
        label: practical[0] ? sentence(practical[0]) : `Apply the documented fix for ${lower(topic.title)} and record what changed.`,
        correct: true,
      },
      {
        id: `res-${slug}-wrong-hide`,
        label: "Turn off the control or alert that is reporting the problem",
        correct: false,
        hint: "Silencing the report hides the symptom and leaves the cause in place.",
      },
      {
        id: `res-${slug}-wrong-rebuild`,
        label: "Rebuild the system from scratch",
        correct: false,
        hint: "A rebuild destroys the evidence and may repeat the same fault.",
      },
    ];

    const verifications: TicketOption[] = [
      {
        id: `ver-${slug}-retest`,
        label: "Repeat the original failing action with the user watching",
        correct: true,
      },
      {
        id: `ver-${slug}-evidence`,
        label: "Re-run the check that first exposed the fault and confirm the result changed",
        correct: true,
      },
      {
        id: `ver-${slug}-monitor`,
        label: "Watch for a recurrence over an agreed period before closing",
        correct: true,
      },
      {
        id: `ver-${slug}-wrong`,
        label: "Close the ticket because the change was applied without errors",
        correct: false,
        hint: "A successful change proves the command ran, not that the user's problem is gone.",
      },
    ];

    const keywords = [
      ...(lesson?.keyTerms ?? []).slice(0, 3).map((term) => term.term.toLowerCase()),
      ...primary.toLowerCase().split(/\s+/).filter((word) => word.length > 4).slice(0, 3),
    ];

    out.push({
      id: `ticket-${slug}`,
      track,
      topicId: topic.id,
      title: `${topic.title}: ${lower(sentence(primary)).replace(/\.$/, "")}`,
      priority: PRIORITIES[(topicIndex + seed) % PRIORITIES.length] as TicketPriority,
      requester: REQUESTERS[seed % REQUESTERS.length] as string,
      report: `"Something is wrong here and it is stopping me working. ${sentence(failure)} It worked fine before today, and a colleague with the same setup is not seeing it."`,
      environment: sentence(where),
      difficulty: topic.difficulty,
      slaNote: "Standard service desk SLA: first response 30 minutes, resolution 8 business hours.",
      actions,
      keyActionIds,
      efficientActionCount: keyActionIds.length,
      diagnoses,
      resolutions,
      verifications,
      reasoningKeywords: keywords,
      communicationKeywords: ["sorry", "next", "update", "check", "confirm"],
      documentationKeywords: ["symptom", "check", "cause", "fix", "verified"],
      rootCause: `${sentence(primary)} ${sentence(failure)} The documented order for this topic is: ${steps
        .map((step) => lower(sentence(step)).replace(/\.$/, ""))
        .join("; then ")}. Following it separates the real cause from the faults that merely look similar.`,
    });
  });

  return out;
}
