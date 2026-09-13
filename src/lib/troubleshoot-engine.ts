import type {
  Incident,
  IncidentAttempt,
  IncidentCategory,
  IncidentScores,
  MistakeCause,
} from "@/lib/app-data/types";

export const incidentCategoryLabels: Record<IncidentCategory, string> = {
  hardware: "Hardware",
  windows: "Windows",
  networking: "Networking",
  dns: "DNS",
  dhcp: "DHCP",
  linux: "Linux",
  security: "Security",
  cloud: "Cloud",
  authentication: "Authentication",
};

export const incidentStageOrder = [
  "diagnose",
  "reasoning",
  "fix",
  "verify",
  "document",
] as const;

export function createIncidentAttempt(
  incident: Incident,
  previousAttemptId?: string,
): IncidentAttempt {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    incidentId: incident.id,
    topicId: incident.topicId,
    status: "in_progress",
    performedActionIds: [],
    causeGuessIds: [],
    reasoning: "",
    verificationIds: [],
    documentation: "",
    ...(previousAttemptId ? { previousAttemptId } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function keywordCoverage(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  const hits = keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
  return keywords.length === 0 ? 0 : hits / keywords.length;
}

/** Wrong guesses before the correct one cost accuracy but never end the attempt. */
function guessAccuracy(incident: Incident, attempt: IncidentAttempt) {
  const correctId = incident.causes.find((cause) => cause.correct)?.id;
  if (!correctId || attempt.selectedCauseId !== correctId) return 0;
  const wrongBefore = attempt.causeGuessIds.indexOf(correctId);
  const misses = wrongBefore < 0 ? attempt.causeGuessIds.length : wrongBefore;
  if (misses === 0) return 100;
  if (misses === 1) return 70;
  if (misses === 2) return 45;
  return 25;
}

export function scoreIncident(
  incident: Incident,
  attempt: IncidentAttempt,
): { scores: IncidentScores; total: number } {
  const performed = attempt.performedActionIds;
  const keyRun = incident.keyActionIds.filter((id) => performed.includes(id)).length;
  const noise = performed.filter(
    (id) => !incident.actions.find((action) => action.id === id)?.informative,
  ).length;

  const diagnosticChoices = clamp(
    (keyRun / incident.keyActionIds.length) * 100 - noise * 12,
  );

  const fixCorrect = incident.fixes.some(
    (fix) => fix.id === attempt.selectedFixId && fix.correct,
  );
  const technicalAccuracy = clamp(guessAccuracy(incident, attempt) * 0.6 + (fixCorrect ? 40 : 0));

  const reasoningText = attempt.reasoning.trim();
  const reasoningLength = Math.min(1, reasoningText.length / 160);
  const reasoning = clamp(
    reasoningText.length < 40
      ? reasoningText.length > 0
        ? 20
        : 0
      : keywordCoverage(reasoningText, incident.reasoningKeywords) * 70 + reasoningLength * 30,
  );

  const efficiency = clamp(
    performed.length === 0
      ? 0
      : keyRun < incident.keyActionIds.length
        ? (keyRun / incident.keyActionIds.length) * 60
        : (incident.efficientActionCount / performed.length) * 100,
  );

  const correctVerifications = incident.verifications.filter((item) => item.correct);
  const chosenCorrect = correctVerifications.filter((item) =>
    attempt.verificationIds.includes(item.id),
  ).length;
  const chosenWrong = attempt.verificationIds.filter(
    (id) => !incident.verifications.find((item) => item.id === id)?.correct,
  ).length;
  const verification = clamp(
    (chosenCorrect / Math.max(1, correctVerifications.length)) * 100 - chosenWrong * 30,
  );

  const documentationText = attempt.documentation.trim();
  const documentation = clamp(
    documentationText.length < 40
      ? documentationText.length > 0
        ? 20
        : 0
      : keywordCoverage(documentationText, incident.documentationKeywords) * 60 +
          Math.min(1, documentationText.length / 220) * 40,
  );

  const scores: IncidentScores = {
    diagnosticChoices,
    technicalAccuracy,
    reasoning,
    efficiency,
    verification,
    documentation,
  };
  const total = Math.round(
    (scores.diagnosticChoices +
      scores.technicalAccuracy +
      scores.reasoning +
      scores.efficiency +
      scores.verification +
      scores.documentation) /
      6,
  );
  return { scores, total };
}

export interface IncidentMistakeSignal {
  category: MistakeCause;
  severity: "low" | "medium" | "high";
  detail: string;
}

/** Troubleshooting errors feed the same central mistake system as quizzes and labs. */
export function incidentMistakeSignals(
  incident: Incident,
  attempt: IncidentAttempt,
  scores: IncidentScores,
): IncidentMistakeSignal[] {
  const signals: IncidentMistakeSignal[] = [];
  const correctCauseId = incident.causes.find((cause) => cause.correct)?.id;
  const wrongGuesses = attempt.causeGuessIds.filter((id) => id !== correctCauseId).length;

  if (attempt.selectedCauseId !== correctCauseId) {
    signals.push({
      category: "scenario_recognition_failure",
      severity: "high",
      detail: "Submitted an incorrect root cause for this incident.",
    });
  } else if (wrongGuesses > 0) {
    signals.push({
      category: "scenario_recognition_failure",
      severity: wrongGuesses > 1 ? "medium" : "low",
      detail: `Reached the correct cause after ${wrongGuesses} incorrect diagnosis${wrongGuesses > 1 ? "es" : ""}.`,
    });
  }

  if (!incident.fixes.some((fix) => fix.id === attempt.selectedFixId && fix.correct)) {
    signals.push({
      category: "reasoning_error",
      severity: "high",
      detail: "Chose a fix that does not address the cause.",
    });
  }

  if (scores.diagnosticChoices < 60) {
    signals.push({
      category: "misunderstood_concept",
      severity: "medium",
      detail: "Key diagnostic evidence was never collected before diagnosing.",
    });
  }

  if (scores.verification < 60) {
    signals.push({
      category: "rushed",
      severity: "medium",
      detail: "Closed the incident without proving the fix worked.",
    });
  }

  if (scores.documentation < 50) {
    signals.push({
      category: "didnt_know_fact",
      severity: "low",
      detail: "Documentation would not let a colleague repeat the diagnosis.",
    });
  }

  return signals;
}

export function incidentStatusLabel(attempt: IncidentAttempt | undefined) {
  if (!attempt) return "Not Started";
  return attempt.status === "submitted" ? "Resolved" : "In Progress";
}
