/**
 * Builds a troubleshooting incident for every curriculum topic from that
 * topic's own module content: its documented common problems, failure modes,
 * diagnostic order and practical knowledge. Findings are simulated support
 * evidence; nothing here claims to inspect real equipment.
 */
import { learningModules } from "@/data/learning-content";
import { a1PracticalProfileFor } from "@/data/auto/a1-practical";
import type { Incident, IncidentCategory, IncidentOption, Lesson, Topic } from "@/lib/app-data/types";

const CATEGORY_RULES: Array<[IncidentCategory, RegExp]> = [
  ["dns", /dns|name resolution/i],
  ["dhcp", /dhcp|addressing|ip address/i],
  ["cloud", /cloud|virtualiz|container/i],
  ["linux", /linux|bash|unix/i],
  ["authentication", /identity|authentic|account|access control|directory/i],
  ["security", /secur|threat|risk|malware|incident|forensic|crypt|vulnerab|complian|pentest/i],
  ["networking", /network|routing|switch|wireless|subnet|firewall|vpn|tcp|protocol/i],
  ["hardware", /hardware|storage|printer|mobile device|power|peripheral/i],
  ["windows", /windows|registry|group policy|powershell/i],
];

function categoryFor(topic: Topic): IncidentCategory {
  for (const source of [topic.title, topic.summary]) {
    for (const [category, pattern] of CATEGORY_RULES) {
      if (pattern.test(source)) return category;
    }
  }
  return "windows";
}

function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function lower(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function hash(value: string): number {
  let total = 0;
  for (let index = 0; index < value.length; index += 1) total += value.charCodeAt(index) * (index + 5);
  return total;
}

function keywords(text: string, limit: number): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 4)
    .slice(0, limit);
}

export function buildTopicIncidents(topics: Topic[], lessons: Lesson[], mode: "it" | "automotive" = "it"): Incident[] {
  const out: Incident[] = [];
  const automotive = mode === "automotive";

  for (const topic of topics) {
    const learningModule = learningModules.find((item) => item.topicId === topic.id);
    if (!learningModule) continue;
    const problems = learningModule.commonProblems;
    const steps = learningModule.troubleshooting;
    const failures = learningModule.howItFails;
    if (problems.length < 2 || steps.length < 2 || failures.length === 0) continue;

    const lesson = lessons.find((item) => item.topicId === topic.id);
    const slug = topic.id.replace(/^topic-/, "");
    const seed = hash(topic.id);
    const primary = problems[0] as string;
    const secondary = problems[1] as string;
    const failure = failures[0] as string;
    const where = learningModule.whereYouSeeIt[0] ?? topic.summary;
    const practical = learningModule.practicalKnowledge;
    const a1 = automotive ? a1PracticalProfileFor(topic.id) : undefined;

    const actions = [
      {
        id: `ia-${slug}-scope`,
        label: automotive ? "Confirm the customer complaint, operating conditions, and recent work" : "Establish the scope: who is affected, since when, and what changed",
        finding: automotive
          ? `The customer confirms the symptom is repeatable under the reported conditions. A comparable operating condition does not produce it. ${sentence(failure)}`
          : `One team reports the problem since a change yesterday. A comparable system that did not receive the change behaves normally. ${sentence(failure)}`,
        informative: true,
      },
      ...(a1 ? a1.testPlan : steps.slice(0, 3)).map((step, index) => ({
        id: `ia-${slug}-step-${index + 1}`,
        label: sentence(step).replace(/\.$/, ""),
        finding: a1
          ? index === 0
            ? "The complaint is verified and the baseline inspection gives you evidence to choose the next test instead of guessing."
            : index === (a1.testPlan.length - 1)
              ? "The result completes the test sequence. Compare the accumulated evidence with service information before choosing the repair."
              : "Record the supplied or observed result and state what it rules in or rules out before continuing."
          : index === 0
            ? `The observations line up with ${lower(sentence(primary))} Nothing yet supports ${lower(sentence(secondary))}`
            : `Recorded. The result is consistent with the first finding and does not introduce a new fault.`,
        informative: true,
      })),
      {
        id: `ia-${slug}-usage`,
        label: automotive ? "Confirm when and how the vehicle normally shows the symptom" : "Confirm how the affected system is normally used",
        finding: sentence(where),
        informative: true,
      },
      {
        id: `ia-${slug}-noise-restart`,
        label: automotive ? "Clear the symptom and return the vehicle without testing" : "Restart everything and see whether the fault clears",
        finding: automotive ? "The symptom returns because no cause was identified or repaired. No useful diagnostic evidence was gathered." : "Services come back and the fault returns shortly afterwards. No evidence was gathered.",
        informative: false,
      },
      {
        id: `ia-${slug}-noise-rebuild`,
        label: automotive ? "Replace the suspected assembly before confirming the fault" : "Rebuild the affected system now",
        finding: automotive ? "Parts replacement without a confirming test adds cost and may leave the original symptom unchanged." : "A rebuild is possible, but nothing observed yet justifies destroying the evidence.",
        informative: false,
      },
    ];

    const keyActionIds = actions.filter((action) => action.informative).map((action) => action.id);

    const otherProblems = topics
      .filter((item) => item.id !== topic.id)
      .map((item) => learningModules.find((entry) => entry.topicId === item.id)?.commonProblems[0])
      .filter((value): value is string => Boolean(value));

    const causes: IncidentOption[] = [
      { id: `ic-${slug}-correct`, label: sentence(primary), correct: true },
      {
        id: `ic-${slug}-plausible`,
        label: sentence(secondary),
        correct: false,
        hint: "This is a genuine fault for this topic, but your findings pointed somewhere more specific. Re-read the first check.",
      },
      ...[0, 1]
        .map((offset) => otherProblems[(seed + offset * 23) % Math.max(otherProblems.length, 1)])
        .filter((value): value is string => Boolean(value))
        .filter((value, index, list) => list.indexOf(value) === index && value !== primary && value !== secondary)
        .map((value, index) => ({
          id: `ic-${slug}-wrong-${index + 1}`,
          label: sentence(value),
          correct: false,
          hint: "Nothing you observed belongs to this cause. Compare it against the evidence you actually collected.",
        })),
    ];

    const fixes: IncidentOption[] = [
      {
        id: `if-${slug}-correct`,
        label: a1 ? sentence(a1.repairDecision) : practical[0] ? sentence(practical[0]) : `Correct the condition behind ${lower(sentence(primary))}`,
        correct: true,
      },
      {
        id: `if-${slug}-hide`,
        label: automotive ? "Clear the warning or code without correcting the cause" : "Silence the alert or warning that reports the problem",
        correct: false,
        hint: automotive ? "Clearing a warning is not a repair. The underlying condition can return." : "Hiding the report leaves the cause running.",
      },
      {
        id: `if-${slug}-scope`,
        label: automotive ? "Mask the symptom without repairing the failed condition" : "Apply a manual workaround for the one user who called",
        correct: false,
        hint: automotive ? "A workaround that hides the symptom does not correct the failed condition." : "A single workaround leaves everyone else exposed to the same cause.",
      },
      {
        id: `if-${slug}-rebuild`,
        label: automotive ? "Replace multiple related parts without isolating the cause" : "Rebuild the system and hope the fault does not return",
        correct: false,
        hint: automotive ? "Parts swapping is not a substitute for isolating the fault with evidence." : "A rebuild without a cause can reproduce the same fault immediately.",
      },
    ];

    const verifications: IncidentOption[] = [
      ...(a1
        ? a1.verification.map((step, index) => ({ id: `iv-${slug}-a1-${index + 1}`, label: sentence(step), correct: true }))
        : [
            { id: `iv-${slug}-repeat`, label: "Repeat the check that first exposed the fault and confirm the result changed", correct: true },
            { id: `iv-${slug}-user`, label: automotive ? "Recreate the customer complaint under the original operating conditions" : "Have an affected user repeat the original failing task", correct: true },
            { id: `iv-${slug}-watch`, label: automotive ? "Complete an appropriate road or functional test and check for recurrence" : "Watch for a recurrence over an agreed period before closing", correct: true },
          ]),
      {
        id: `iv-${slug}-assume`,
        label: automotive ? "Return the vehicle because the repair step completed without an error" : "Close it because the change applied without an error",
        correct: false,
        hint: automotive ? "Completing a repair step does not prove the original complaint is gone. Verify it." : "A successful change proves the command ran, not that the fault is gone.",
      },
    ];

    out.push({
      id: `incident-${slug}`,
      topicId: topic.id,
      category: categoryFor(topic),
      title: `${topic.title}: ${lower(sentence(primary)).replace(/\.$/, "")}`,
      report: automotive
        ? `A customer brings in a vehicle with a repeatable concern related to ${topic.title.toLowerCase()}. ${sentence(failure)} Your job is to verify the complaint, gather evidence, isolate the cause, choose a proportionate repair, and prove the repair worked.`
        : `Users report that something related to ${topic.title.toLowerCase()} stopped behaving normally. ${sentence(failure)} It worked before the most recent change, and an equivalent system is unaffected.`,
      environment: sentence(where),
      difficulty: topic.difficulty,
      actions,
      keyActionIds,
      efficientActionCount: keyActionIds.length,
      causes,
      fixes,
      verifications,
      reasoningKeywords: [
        ...(lesson?.keyTerms ?? []).slice(0, 2).map((term) => term.term.toLowerCase()),
        ...keywords(primary, 3),
      ],
      documentationKeywords: automotive ? ["complaint", "test", "cause", "repair", "verif"] : ["symptom", "check", "cause", "fix", "verif"],
      rootCause: `${sentence(primary)} ${sentence(failure)} Working the documented order, ${(a1 ? a1.testPlan : steps)
        .map((step) => lower(sentence(step)).replace(/\.$/, ""))
        .join("; then ")}, separates this cause from ${lower(sentence(secondary))}`,
    });
  }

  return out;
}
