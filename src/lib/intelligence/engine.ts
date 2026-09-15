/**
 * Learning Intelligence Engine.
 *
 * One model the whole app asks: what does this learner need next, why are they
 * struggling, how should it be taught, at what difficulty, and when does it
 * come back. It is derived state — rebuilt from `UserData` — so every recorded
 * answer, grade, lab, ticket or terminal attempt updates it immediately.
 *
 * It reuses the existing pieces rather than duplicating them: the evidence
 * stream and concept profiles from the learner model, full-scope dimension
 * scores, the learner's own review records, and the certification path.
 */
import { topics } from "@/data/static-content";
import { certificationTopics } from "@/lib/cert-path";
import { adaptivePath } from "@/lib/adaptive-path";
import { buildLearnerModel } from "@/lib/learner-model";
import { evidenceStream } from "@/lib/learner-signals";
import { topicScopeProgress } from "@/lib/scope-progress";
import type { EntityId, LearnerSignal, UserData } from "@/lib/app-data/types";
import { diagnose, measure } from "./diagnose";
import { evidenceStrength, gradedSignals, transferEvidence, velocityFrom } from "./evidence";
import { hypothesize } from "./hypothesis";
import { interventionHistory } from "./interventions";
import { prescribe } from "./prescribe";
import { interleave, timingFor } from "./schedule";
import { assessState, STATE_LABEL, STATE_MEANING, type LearningState } from "./states";
import {
  DIAGNOSIS_LABEL,
  METHOD_LABEL,
  type ConceptIntel,
  type Diagnosis,
  type Intelligence,
  type LearningPlan,
  type PlanItem,
  type TraceStep,
} from "./types";

/** How urgent each diagnosis is before mastery and forgetting are applied. */
const DIAGNOSIS_WEIGHT: Record<Diagnosis, number> = {
  prerequisite_gap: 95,
  misconception: 90,
  confident_but_wrong: 88,
  retrieval_failure: 82,
  application_failure: 70,
  troubleshooting_failure: 66,
  fading: 60,
  never_learned: 45,
  solid: 8,
};

const EMPTY_MIX: Record<Diagnosis, number> = {
  never_learned: 0,
  prerequisite_gap: 0,
  retrieval_failure: 0,
  misconception: 0,
  application_failure: 0,
  troubleshooting_failure: 0,
  confident_but_wrong: 0,
  fading: 0,
  solid: 0,
};

function evidenceSentence(intel: Omit<ConceptIntel, "evidence">): string {
  const pct = Math.round(intel.mastery * 100);
  switch (intel.diagnosis) {
    case "never_learned":
      return "Nothing recorded on this yet.";
    case "prerequisite_gap": {
      const gap = intel.prerequisiteGaps[0];
      return gap
        ? `${gap.title} is only at ${Math.round(gap.mastery * 100)}%, and this builds on it.`
        : "A prerequisite for this is still unproven.";
    }
    case "retrieval_failure":
      return `You had this right before and missed it again recently — ${pct}% overall.`;
    case "misconception":
      return intel.misconceptions[0]
        ? `Same error keeps coming back: ${intel.misconceptions[0].toLowerCase()}.`
        : `Repeated errors of the same kind across ${intel.attempts} answers.`;
    case "application_failure":
      return `You can explain it, but applied work on it is behind at ${pct}%.`;
    case "troubleshooting_failure":
      return "Your facts hold up; the fault-finding process on this is the weak part.";
    case "confident_but_wrong":
      return `${intel.confidentErrors} fast, assured answers on this were wrong.`;
    case "fading":
      return intel.daysOverdue > 0
        ? `Recall is fading — ${intel.daysOverdue} day(s) past its best review point.`
        : "Recall is fading against its spacing interval.";
    case "solid":
      return `Strong at ${pct}% with recent evidence. Spaced review only.`;
  }
}


interface TraceInput {
  strength: ReturnType<typeof evidenceStrength>;
  transfer: ReturnType<typeof transferEvidence>;
  state: LearningState;
  stateBlockedBy: string | null;
  diagnosis: Diagnosis;
  hypotheses: ReturnType<typeof hypothesize>;
  prescription: ReturnType<typeof prescribe>;
  history: ReturnType<typeof interventionHistory>;
  velocity: number;
  timing: { nextReviewAt: string; daysOverdue: number };
  priority: number;
}

/**
 * The audit trail. Every recommendation carries one line per stage of the
 * cycle, each naming the recorded fact it rests on, so nothing the engine says
 * is unexplainable.
 */
function buildTrace(input: TraceInput): TraceStep[] {
  const { strength, transfer, hypotheses, prescription, history } = input;
  const measured = history.byMethod.filter((effect) => effect.measured > 0);
  const best = measured[0];

  const steps: TraceStep[] = [
    {
      stage: "observe",
      detail:
        strength.gradedSignals === 0
          ? "No graded work recorded on this concept."
          : `${strength.gradedSignals} graded result(s) across ${strength.independentSources} activity type(s) on ${strength.distinctDays} separate day(s) — ${strength.level} evidence.`,
    },
    {
      stage: "diagnose",
      detail: `${DIAGNOSIS_LABEL[input.diagnosis]} — ${STATE_LABEL[input.state]}: ${STATE_MEANING[input.state]}${input.stateBlockedBy ? ` ${input.stateBlockedBy}` : ""}`,
    },
    {
      stage: "hypothesize",
      detail: `${DIAGNOSIS_LABEL[hypotheses.leading.diagnosis]} (${hypotheses.leading.status}, ${Math.round(hypotheses.certainty * 100)}% certainty): ${hypotheses.leading.because.join(" ")}${
        hypotheses.alternatives[0]
          ? ` Competing cause considered: ${DIAGNOSIS_LABEL[hypotheses.alternatives[0].diagnosis].toLowerCase()}.`
          : ""
      }`,
    },
    {
      stage: "intervene",
      detail: prescription.isDiagnostic
        ? `Controlled test first — ${prescription.instruction}`
        : `${METHOD_LABEL[prescription.method]} at ${prescription.difficulty} level — ${prescription.instruction}${prescription.methodReason ? ` ${prescription.methodReason}` : ""}`,
    },
    {
      stage: "retest",
      detail: best
        ? `Past ${METHOD_LABEL[best.method].toLowerCase()} on this moved results by ${best.meanDelta} points across ${best.measured} measured use(s).`
        : "No before-and-after measurement available yet; the next result becomes the first.",
    },
    {
      stage: "transfer",
      detail:
        transfer.attemptedContexts === 0
          ? "Never tested outside recall questions."
          : `Passed ${Math.round(transfer.score * 100)}% of applied and hands-on attempts across ${transfer.provenContexts} proven context(s).`,
    },
    {
      stage: "update",
      detail:
        input.velocity === 0
          ? "Not enough recent results to measure a trend."
          : `Results are moving ${input.velocity > 0 ? "up" : "down"} by ${Math.abs(input.velocity)} points a week.`,
    },
    {
      stage: "adapt",
      detail: `Next touch ${input.timing.daysOverdue > 0 ? `${input.timing.daysOverdue} day(s) overdue` : `due ${input.timing.nextReviewAt.slice(0, 10)}`}; ranked at ${Math.round(input.priority)}.`,
    },
  ];

  return steps;
}

export function buildIntelligence(user: UserData, now: Date = new Date()): Intelligence {
  const nowMs = now.getTime();
  const model = buildLearnerModel(user, now);
  const stream: LearnerSignal[] = evidenceStream(user);
  const path = adaptivePath(user);
  const targetIds = new Set(certificationTopics(path.certification.id).map((topic) => topic.id));

  const byTopicSignals = new Map<EntityId, LearnerSignal[]>();
  for (const signal of stream) {
    const list = byTopicSignals.get(signal.topicId);
    if (list) list.push(signal);
    else byTopicSignals.set(signal.topicId, [signal]);
  }

  const concepts: ConceptIntel[] = topics.map((topic) => {
    const profile = model.byTopic[topic.id]!;
    const scope = topicScopeProgress(user, topic.id);
    const signals = byTopicSignals.get(topic.id) ?? [];
    const measures = measure(signals, scope, nowMs);

    const unresolvedMistakes = user.mistakes.filter(
      (mistake) => mistake.topicId === topic.id && !mistake.resolved,
    ).length;
    const repeatedMisconception = profile.errorPatterns.some((pattern) => pattern.count >= 2);
    const prerequisiteGaps = profile.prerequisites
      .filter((prerequisite) => !prerequisite.satisfied)
      .map((prerequisite) => ({
        topicId: prerequisite.topicId,
        title: prerequisite.title,
        mastery: prerequisite.mastery,
      }));

    // 1. Observe — graded evidence, its breadth and its spacing.
    const graded = gradedSignals(signals);
    const strength = evidenceStrength(graded, nowMs);
    const transfer = transferEvidence(graded);
    const velocity = velocityFrom(graded, nowMs);

    // 2. Diagnose — the rule chain names the failure type.
    const diagnosis = diagnose({
      profile,
      scope,
      measures,
      unresolvedMistakes,
      repeatedMisconception,
      prerequisiteGap: prerequisiteGaps.length > 0,
      retention: profile.retention,
    });

    // 3. Hypothesize — competing causes, each needing independent support.
    const hypotheses = hypothesize({
      profile,
      scope,
      measures,
      evidence: strength,
      transfer,
      unresolvedMistakes,
      repeatedMisconception,
      prerequisiteGap: prerequisiteGaps.length > 0,
    });

    // 4. Measure past interventions before prescribing another one.
    const history = interventionHistory(
      graded,
      signals.map((signal) => ({
        kind: signal.kind,
        atMs: new Date(signal.at).getTime(),
        at: signal.at,
      })),
    );

    const passes = graded.filter((entry) => entry.outcome >= 0.7);
    const passSpanDays =
      passes.length >= 2
        ? Math.round(
            (passes[passes.length - 1]!.atMs - passes[0]!.atMs) / (24 * 60 * 60 * 1000),
          )
        : 0;

    const stateAssessment = assessState({
      mastery: profile.mastery,
      accuracy: profile.accuracy,
      retention: profile.retention,
      evidence: strength,
      transfer,
      recentFailureAfterSuccess: measures.recentFailureAfterSuccess,
      unresolvedMisconception: repeatedMisconception && unresolvedMistakes > 0,
      passSpanDays,
      daysSinceExposure: profile.daysSinceExposure,
    });

    // 5. Intervene — treatment when the cause is confirmed, a test when it is not.
    const prescription = prescribe(profile, diagnosis, {
      state: stateAssessment.state,
      interventions: history,
      diagnosticTest: hypotheses.test,
      certainty: hypotheses.certainty,
    });
    const timing = timingFor(
      topic.id,
      profile.mastery,
      profile.attempts,
      profile.lastExposureAt,
      user.reviews,
      nowMs,
    );

    const onTargetPath = targetIds.has(topic.id);
    const forgettingRisk = (1 - profile.retention) * (0.4 + 0.6 * profile.mastery);

    // 8. Adapt — ranking reflects cause, decay, uncertainty and measured progress.
    let priority = DIAGNOSIS_WEIGHT[diagnosis];
    priority += (1 - profile.mastery) * 20;
    priority += forgettingRisk * 18;
    priority += Math.min(timing.daysOverdue, 14) * 1.5;
    priority += Math.min(unresolvedMistakes, 5) * 3;
    // A cheap test that settles an unclear cause is worth doing early.
    if (prescription.isDiagnostic) priority += 6;
    // Concepts already climbing need less intervention than stalled ones.
    if (velocity > 5) priority -= 6;
    if (velocity < -5) priority += 6;
    // Claiming a concept is fine on one activity type is not enough to drop it.
    if (diagnosis === "solid" && strength.independentSources < 2) priority += 14;
    if (!onTargetPath) priority -= 30;

    const trace = buildTrace({
      strength,
      transfer,
      state: stateAssessment.state,
      stateBlockedBy: stateAssessment.blockedBy,
      diagnosis,
      hypotheses,
      prescription,
      history,
      velocity,
      timing,
      priority,
    });

    const partial: Omit<ConceptIntel, "evidence"> = {
      topicId: topic.id,
      title: topic.title,
      certificationId: topic.certificationId,
      mastery: profile.mastery,
      confidence: profile.confidence,
      retention: profile.retention,
      forgettingRisk,
      accuracy: profile.accuracy,
      attempts: profile.attempts,
      avgResponseSeconds: profile.avgResponseSeconds,
      efficiency: measures.efficiency,
      confidentErrors: measures.confidentErrors,
      misconceptions: profile.errorPatterns.map((pattern) => pattern.label),
      unresolvedMistakes,
      prerequisiteGaps,
      diagnosis,
      method: prescription.method,
      difficulty: prescription.difficulty,
      route: prescription.route,
      instruction: prescription.instruction,
      estimatedMinutes: prescription.estimatedMinutes,
      nextReviewAt: timing.nextReviewAt,
      daysOverdue: timing.daysOverdue,
      priority: Math.round(priority),
      onTargetPath,
      state: stateAssessment.state,
      stateBlockedBy: stateAssessment.blockedBy,
      evidenceStrength: strength,
      transfer,
      velocity,
      hypotheses: [hypotheses.leading, ...hypotheses.alternatives],
      certainty: hypotheses.certainty,
      diagnosticTest: hypotheses.test,
      isDiagnostic: prescription.isDiagnostic,
      interventions: history,
      methodReason: prescription.methodReason,
      trace,
    };

    return { ...partial, evidence: evidenceSentence(partial) };
  });

  concepts.sort((a, b) => b.priority - a.priority);

  const diagnosisMix = { ...EMPTY_MIX };
  for (const concept of concepts) diagnosisMix[concept.diagnosis] += 1;

  const stateMix: Record<LearningState, number> = {
    unknown: 0,
    emerging: 0,
    fragile: 0,
    functional: 0,
    transferable: 0,
    reliable: 0,
    retained: 0,
  };
  for (const concept of concepts) stateMix[concept.state] += 1;

  const onPath = concepts.filter((concept) => concept.onTargetPath);
  const functional = onPath.filter((concept) =>
    ["functional", "transferable", "reliable", "retained"].includes(concept.state),
  ).length;
  const pathFunctional = onPath.length === 0 ? 0 : Number((functional / onPath.length).toFixed(3));

  const queue = interleave(
    concepts.filter((concept) => concept.diagnosis !== "solid" && concept.onTargetPath),
  );

  const planFor = (minutes: number): LearningPlan => {
    const target = Math.max(10, Math.round(minutes));
    const items: PlanItem[] = [];
    let used = 0;
    for (const concept of queue) {
      if (used >= target) break;
      const remaining = target - used;
      const slot = Math.min(concept.estimatedMinutes, Math.max(10, remaining));
      if (slot < 8 && items.length > 0) break;
      items.push({ ...concept, minutes: slot });
      used += slot;
    }
    // Spend any leftover minutes on the highest-value item rather than under-filling.
    if (items.length > 0 && used < target) {
      const first = items[0]!;
      const extra = target - used;
      first.minutes += extra;
      used = target;
    }
    return { targetMinutes: target, plannedMinutes: used, items };
  };

  return {
    generatedAt: now.toISOString(),
    certificationId: path.certification.id,
    certificationTitle: path.certification.title,
    concepts,
    byTopic: Object.fromEntries(concepts.map((concept) => [concept.topicId, concept])),
    queue,
    diagnosisMix,
    stateMix,
    pathFunctional,
    hasEvidence: stream.length > 0,
    planFor,
  };
}

/** A short plain-language summary of the diagnosis mix, for readiness panels. */
export function diagnosisSummary(intel: Intelligence): string[] {
  return (Object.keys(intel.diagnosisMix) as Diagnosis[])
    .filter((diagnosis) => diagnosis !== "solid" && diagnosis !== "never_learned")
    .filter((diagnosis) => intel.diagnosisMix[diagnosis] > 0)
    .sort((a, b) => intel.diagnosisMix[b] - intel.diagnosisMix[a])
    .map((diagnosis) => `${intel.diagnosisMix[diagnosis]} × ${DIAGNOSIS_LABEL[diagnosis].toLowerCase()}`);
}
