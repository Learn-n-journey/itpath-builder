/**
 * Career skills engine.
 *
 * Every number here is derived from recorded user evidence. Nothing is hard-coded:
 * a skill with no evidence stays at zero and is reported as "no evidence yet".
 */
import { staticContent } from "@/data/static-content";
import type {
  CareerTrack,
  EntityId,
  UserData,
} from "@/lib/app-data/types";

export type SkillId =
  | "hardware"
  | "windows"
  | "linux"
  | "networking"
  | "powershell"
  | "bash"
  | "active_directory"
  | "cloud"
  | "security"
  | "ticketing"
  | "documentation"
  | "communication"
  | "troubleshooting";

export const skillIds: SkillId[] = [
  "hardware",
  "windows",
  "linux",
  "networking",
  "powershell",
  "bash",
  "active_directory",
  "cloud",
  "security",
  "ticketing",
  "documentation",
  "communication",
  "troubleshooting",
];

export const skillLabels: Record<SkillId, string> = {
  hardware: "Hardware",
  windows: "Windows",
  linux: "Linux",
  networking: "Networking",
  powershell: "PowerShell",
  bash: "Bash",
  active_directory: "Active Directory",
  cloud: "Cloud",
  security: "Security",
  ticketing: "Ticketing",
  documentation: "Documentation",
  communication: "Communication",
  troubleshooting: "Troubleshooting",
};

export type EvidenceSource =
  | "learn"
  | "recall"
  | "practice"
  | "lab"
  | "assignment"
  | "quiz"
  | "troubleshoot"
  | "career";

export const evidenceSourceLabels: Record<EvidenceSource, string> = {
  learn: "Learn",
  recall: "Recall",
  practice: "Practice",
  lab: "Labs",
  assignment: "Assignments",
  quiz: "Quizzes",
  troubleshoot: "Troubleshooting",
  career: "Career Mode",
};

export interface EvidenceItem {
  id: string;
  skillId: SkillId;
  source: EvidenceSource;
  label: string;
  /** 0-100 quality of this piece of evidence. */
  score: number;
  /** Relative importance: practical work counts for more than reading. */
  weight: number;
  at: string;
}

export interface SkillScore {
  skillId: SkillId;
  label: string;
  /** 0-100, weighted mean of every piece of evidence, scaled by coverage. Zero when there is none. */
  score: number;
  /** 0-100: share of the available content for this skill that has been attempted. */
  coverage: number;
  /** Quality of the recorded evidence alone, before coverage scaling. */
  accuracy: number;
  availableCount: number;
  coveredCount: number;
  evidenceCount: number;
  hasEvidence: boolean;
  sources: EvidenceSource[];
  evidence: EvidenceItem[];
}

/* ------------------------------------------------------------------ */
/* Content -> skill mapping                                            */
/* ------------------------------------------------------------------ */

const topicSkills: Record<EntityId, SkillId[]> = {
  "topic-computer-hardware-basics": ["hardware"],
  "topic-operating-systems-overview": ["windows", "linux"],
  "topic-basic-networking-concepts": ["networking"],
  "topic-command-line-fundamentals": ["powershell", "bash"],
  "topic-virtualization-basics": ["cloud"],
  "topic-it-career-overview": ["ticketing", "communication", "documentation"],
  "topic-networking-basics": ["networking"],
  "topic-dns-fundamentals": ["networking"],
};

const labCategorySkills: Record<string, SkillId[]> = {
  hardware: ["hardware"],
  windows: ["windows"],
  networking: ["networking"],
  linux: ["linux"],
  powershell: ["powershell"],
  bash: ["bash"],
  dns: ["networking"],
  security: ["security"],
  cloud: ["cloud"],
};

const incidentCategorySkills: Record<string, SkillId[]> = {
  hardware: ["hardware"],
  windows: ["windows"],
  networking: ["networking"],
  dns: ["networking"],
  dhcp: ["networking"],
  linux: ["linux"],
  security: ["security"],
  cloud: ["cloud"],
  authentication: ["active_directory"],
};

const trackSkills: Record<CareerTrack, SkillId[]> = {
  help_desk: ["ticketing", "communication"],
  it_technician: ["hardware", "windows"],
  network_technician: ["networking"],
  junior_sysadmin: ["windows", "linux", "active_directory"],
  junior_security_analyst: ["security"],
};

/** How much each skill matters for a job. Readiness is the weighted mean of these. */
const trackProfiles: Record<CareerTrack, Partial<Record<SkillId, number>>> = {
  help_desk: {
    hardware: 2, windows: 3, networking: 2, ticketing: 3,
    communication: 3, documentation: 2, troubleshooting: 3, active_directory: 1,
  },
  it_technician: {
    hardware: 3, windows: 3, networking: 2, powershell: 1, linux: 1,
    ticketing: 2, documentation: 2, communication: 2, troubleshooting: 3,
  },
  network_technician: {
    networking: 4, troubleshooting: 3, hardware: 1, linux: 1,
    documentation: 2, ticketing: 1, communication: 1, security: 1,
  },
  junior_sysadmin: {
    windows: 3, linux: 3, active_directory: 3, powershell: 2, bash: 2,
    cloud: 2, networking: 2, documentation: 2, troubleshooting: 3,
  },
  junior_security_analyst: {
    security: 4, networking: 3, windows: 2, linux: 2, active_directory: 2,
    documentation: 2, troubleshooting: 2, communication: 1,
  },
};

export const trackLabels: Record<CareerTrack, string> = {
  help_desk: "Help Desk",
  it_technician: "IT Technician",
  network_technician: "Network Technician",
  junior_sysadmin: "Junior Sysadmin",
  junior_security_analyst: "Junior Security Analyst",
};

export const careerTracks: CareerTrack[] = [
  "help_desk",
  "it_technician",
  "network_technician",
  "junior_sysadmin",
  "junior_security_analyst",
];

/* ------------------------------------------------------------------ */
/* Evidence collection                                                 */
/* ------------------------------------------------------------------ */

const pct = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function topicTitle(topicId: EntityId) {
  return staticContent.topics.find((t) => t.id === topicId)?.title ?? topicId;
}

function ratio(correct: number, total: number) {
  return total === 0 ? 0 : (correct / total) * 100;
}

export function collectEvidence(user: UserData): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const push = (item: EvidenceItem) => items.push(item);
  const forTopic = (topicId: EntityId) => topicSkills[topicId] ?? [];

  // Learn: recorded understanding across the six progress dimensions.
  for (const progress of Object.values(user.topicProgress)) {
    const dims = [
      progress.understanding, progress.recall, progress.application,
      progress.practicalAbility, progress.troubleshooting, progress.retention,
    ];
    const value = dims.reduce((a, b) => a + b, 0) / dims.length;
    if (value <= 0) continue;
    for (const skillId of forTopic(progress.topicId)) {
      push({
        id: `learn-${progress.topicId}-${skillId}`,
        skillId, source: "learn",
        label: `${topicTitle(progress.topicId)} — recorded understanding`,
        score: pct(value), weight: 1, at: progress.updatedAt,
      });
    }
  }

  // Recall and practice: correctness per topic.
  const groupBy = <T,>(rows: T[], key: (row: T) => string) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const k = key(row);
      map.set(k, [...(map.get(k) ?? []), row]);
    }
    return map;
  };

  for (const [topicId, rows] of groupBy(user.recallResponses, (r) => r.topicId)) {
    const correct = rows.filter((r) => r.correct).length;
    for (const skillId of forTopic(topicId)) {
      push({
        id: `recall-${topicId}-${skillId}`, skillId, source: "recall",
        label: `${topicTitle(topicId)} — ${correct}/${rows.length} recall answers correct`,
        score: pct(ratio(correct, rows.length)), weight: 1.5,
        at: rows[rows.length - 1]!.createdAt,
      });
    }
  }

  for (const [topicId, rows] of groupBy(user.practiceResponses, (r) => r.topicId)) {
    const correct = rows.filter((r) => r.correct).length;
    for (const skillId of forTopic(topicId)) {
      push({
        id: `practice-${topicId}-${skillId}`, skillId, source: "practice",
        label: `${topicTitle(topicId)} — ${correct}/${rows.length} practice activities correct`,
        score: pct(ratio(correct, rows.length)), weight: 1.5,
        at: rows[rows.length - 1]!.createdAt,
      });
    }
  }

  // Quizzes: per-topic correctness across submitted attempts.
  const quizResults = user.quizAttempts
    .filter((attempt) => attempt.status === "submitted")
    .flatMap((attempt) => attempt.results.map((r) => ({ ...r, at: attempt.submittedAt ?? attempt.updatedAt })));
  for (const [topicId, rows] of groupBy(quizResults, (r) => r.topicId)) {
    const correct = rows.filter((r) => r.correct).length;
    for (const skillId of forTopic(topicId)) {
      push({
        id: `quiz-${topicId}-${skillId}`, skillId, source: "quiz",
        label: `${topicTitle(topicId)} — ${correct}/${rows.length} quiz questions correct`,
        score: pct(ratio(correct, rows.length)), weight: 2,
        at: rows[rows.length - 1]!.at,
      });
    }
  }

  // Labs: scored practical work.
  for (const attempt of user.labAttempts) {
    if (attempt.status === "in_progress" || attempt.maxScore <= 0) continue;
    const lab = staticContent.labs.find((l) => l.id === attempt.labId);
    if (!lab) continue;
    const value = pct((attempt.score / attempt.maxScore) * 100);
    for (const skillId of labCategorySkills[lab.category] ?? []) {
      push({
        id: `lab-${lab.id}-${skillId}`, skillId, source: "lab",
        label: `${lab.title} — lab scored ${value}%`,
        score: value, weight: 3, at: attempt.updatedAt,
      });
    }
    push({
      id: `lab-${lab.id}-documentation`, skillId: "documentation", source: "lab",
      label: `${lab.title} — written reflection`,
      score: pct(Math.min(100, attempt.reflection.trim().length)), weight: 1, at: attempt.updatedAt,
    });
  }

  // Assignments: evaluated or completed rubric scores.
  for (const attempt of user.assignmentAttempts) {
    if (attempt.score === undefined || !attempt.maxScore) continue;
    const assignment = staticContent.assignments.find((a) => a.id === attempt.assignmentId);
    if (!assignment) continue;
    const value = pct((attempt.score / attempt.maxScore) * 100);
    const skills = new Set<SkillId>(forTopic(assignment.topicId));
    if (assignment.type === "explain" || assignment.type === "teach_back") skills.add("communication");
    if (assignment.type === "incident" || assignment.type === "design" || assignment.type === "capstone") {
      skills.add("documentation");
    }
    if (assignment.type === "troubleshoot" || assignment.type === "scenario") skills.add("troubleshooting");
    if (assignment.type === "command_challenge") { skills.add("powershell"); skills.add("bash"); }
    for (const skillId of skills) {
      push({
        id: `assignment-${assignment.id}-${skillId}`, skillId, source: "assignment",
        label: `${assignment.title} — assignment scored ${value}%`,
        score: value, weight: 2.5, at: attempt.updatedAt,
      });
    }
  }

  // Troubleshooting incidents: dimension scores go to the skills they measure.
  for (const attempt of user.incidentAttempts) {
    if (attempt.status !== "submitted" || !attempt.scores) continue;
    const incident = staticContent.incidents.find((i) => i.id === attempt.incidentId);
    if (!incident) continue;
    const s = attempt.scores;
    const at = attempt.submittedAt ?? attempt.updatedAt;
    for (const skillId of incidentCategorySkills[incident.category] ?? []) {
      push({
        id: `incident-${incident.id}-${skillId}`, skillId, source: "troubleshoot",
        label: `${incident.title} — technical accuracy ${pct(s.technicalAccuracy)}%`,
        score: pct(s.technicalAccuracy), weight: 3, at,
      });
    }
    push({
      id: `incident-${incident.id}-troubleshooting`, skillId: "troubleshooting", source: "troubleshoot",
      label: `${incident.title} — diagnosis, reasoning and verification`,
      score: pct((s.diagnosticChoices + s.reasoning + s.verification + s.efficiency) / 4),
      weight: 3, at,
    });
    push({
      id: `incident-${incident.id}-documentation`, skillId: "documentation", source: "troubleshoot",
      label: `${incident.title} — incident write-up`,
      score: pct(s.documentation), weight: 2, at,
    });
  }

  // Career Mode tickets: real job behaviour across six scored dimensions.
  for (const attempt of user.ticketAttempts) {
    if (attempt.status !== "submitted" || !attempt.scores) continue;
    const ticket = staticContent.tickets.find((t) => t.id === attempt.ticketId);
    if (!ticket) continue;
    const s = attempt.scores;
    const at = attempt.submittedAt ?? attempt.updatedAt;
    const title = ticket.title;
    for (const skillId of trackSkills[ticket.track]) {
      push({
        id: `ticket-${ticket.id}-${skillId}`, skillId, source: "career",
        label: `${title} — technical accuracy ${pct(s.technicalAccuracy)}%`,
        score: pct(s.technicalAccuracy), weight: 3.5, at,
      });
    }
    const dimension: Array<[SkillId, number, string]> = [
      ["troubleshooting", s.troubleshooting, "troubleshooting"],
      ["communication", s.communication, "user communication"],
      ["documentation", s.documentation, "ticket notes"],
      ["ticketing", (s.efficiency + (attempt.totalScore ?? 0)) / 2, "ticket handling"],
    ];
    for (const [skillId, value, what] of dimension) {
      push({
        id: `ticket-${ticket.id}-${skillId}`, skillId, source: "career",
        label: `${title} — ${what} ${pct(value)}%`,
        score: pct(value), weight: 3, at,
      });
    }
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* Coverage: what exists for a skill vs what has been attempted        */
/* ------------------------------------------------------------------ */

interface SkillOpportunity {
  topicIds: Set<EntityId>;
  labIds: Set<EntityId>;
  incidentIds: Set<EntityId>;
  ticketIds: Set<EntityId>;
  assignmentIds: Set<EntityId>;
}

function emptyOpportunity(): SkillOpportunity {
  return { topicIds: new Set(), labIds: new Set(), incidentIds: new Set(), ticketIds: new Set(), assignmentIds: new Set() };
}

/** Every piece of content that could produce evidence for each skill. */
function buildOpportunities(): Map<SkillId, SkillOpportunity> {
  const map = new Map<SkillId, SkillOpportunity>(skillIds.map((id) => [id, emptyOpportunity()]));
  const add = (skillId: SkillId, kind: keyof SkillOpportunity, id: EntityId) => {
    map.get(skillId)?.[kind].add(id);
  };
  for (const [topicId, skills] of Object.entries(topicSkills)) {
    for (const skillId of skills) add(skillId, "topicIds", topicId);
  }
  for (const lab of staticContent.labs) {
    for (const skillId of labCategorySkills[lab.category] ?? []) add(skillId, "labIds", lab.id);
    add("documentation", "labIds", lab.id);
  }
  for (const incident of staticContent.incidents) {
    for (const skillId of incidentCategorySkills[incident.category] ?? []) add(skillId, "incidentIds", incident.id);
    add("troubleshooting", "incidentIds", incident.id);
    add("documentation", "incidentIds", incident.id);
  }
  for (const ticket of staticContent.tickets) {
    for (const skillId of trackSkills[ticket.track]) add(skillId, "ticketIds", ticket.id);
    add("troubleshooting", "ticketIds", ticket.id);
    add("communication", "ticketIds", ticket.id);
    add("documentation", "ticketIds", ticket.id);
    add("ticketing", "ticketIds", ticket.id);
  }
  for (const assignment of staticContent.assignments) {
    const skills = new Set<SkillId>(topicSkills[assignment.topicId] ?? []);
    if (assignment.type === "explain" || assignment.type === "teach_back") skills.add("communication");
    if (assignment.type === "incident" || assignment.type === "design" || assignment.type === "capstone") skills.add("documentation");
    if (assignment.type === "troubleshoot" || assignment.type === "scenario") skills.add("troubleshooting");
    if (assignment.type === "command_challenge") { skills.add("powershell"); skills.add("bash"); }
    for (const skillId of skills) add(skillId, "assignmentIds", assignment.id);
  }
  return map;
}

function coveredContent(user: UserData, opportunity: SkillOpportunity): number {
  let covered = 0;
  for (const topicId of opportunity.topicIds) {
    const p = user.topicProgress[topicId];
    const progressMade = p && [p.understanding, p.recall, p.application, p.practicalAbility, p.troubleshooting, p.retention].some((v) => v > 0);
    const answered =
      user.recallResponses.some((r) => r.topicId === topicId) ||
      user.practiceResponses.some((r) => r.topicId === topicId) ||
      user.quizAttempts.some((a) => a.status === "submitted" && a.results.some((r) => r.topicId === topicId));
    if (progressMade || answered) covered += 1;
  }
  for (const labId of opportunity.labIds) {
    if (user.labAttempts.some((a) => a.labId === labId && a.status !== "in_progress")) covered += 1;
  }
  for (const incidentId of opportunity.incidentIds) {
    if (user.incidentAttempts.some((a) => a.incidentId === incidentId && a.status === "submitted")) covered += 1;
  }
  for (const ticketId of opportunity.ticketIds) {
    if (user.ticketAttempts.some((a) => a.ticketId === ticketId && a.status === "submitted")) covered += 1;
  }
  for (const assignmentId of opportunity.assignmentIds) {
    if (user.assignmentAttempts.some((a) => a.assignmentId === assignmentId && a.score !== undefined)) covered += 1;
  }
  return covered;
}

export function scoreSkills(user: UserData): SkillScore[] {
  const evidence = collectEvidence(user);
  const opportunities = buildOpportunities();
  return skillIds.map((skillId) => {
    const bestByActivity = new Map<string, EvidenceItem>();
    for (const item of evidence.filter((row) => row.skillId === skillId)) {
      const current = bestByActivity.get(item.id);
      if (!current || item.score > current.score || (item.score === current.score && item.at > current.at)) {
        bestByActivity.set(item.id, item);
      }
    }
    const rows = [...bestByActivity.values()].sort((a, b) => (a.at < b.at ? 1 : -1));
    const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0);
    const accuracy = totalWeight === 0
      ? 0
      : pct(rows.reduce((sum, row) => sum + row.score * row.weight, 0) / totalWeight);
    const opportunity = opportunities.get(skillId)!;
    const availableCount =
      opportunity.topicIds.size +
      opportunity.labIds.size +
      opportunity.incidentIds.size +
      opportunity.ticketIds.size +
      opportunity.assignmentIds.size;
    const coveredCount = coveredContent(user, opportunity);
    // A skill is only as strong as the share of available material actually
    // attempted: one perfect practice task cannot read as mastery.
    const coverageRatio = availableCount === 0 ? 0 : coveredCount / availableCount;
    const score = pct(accuracy * coverageRatio);
    return {
      skillId,
      label: skillLabels[skillId],
      score,
      coverage: pct(coverageRatio * 100),
      accuracy,
      availableCount,
      coveredCount,
      evidenceCount: rows.length,
      hasEvidence: rows.length > 0,
      sources: [...new Set(rows.map((row) => row.source))],
      evidence: rows,
    };
  });
}

export interface TrackReadiness {
  track: CareerTrack;
  label: string;
  /** 0-100. Skills with no evidence count as zero, so readiness starts at zero. */
  score: number;
  coverage: number;
  weakSkills: SkillScore[];
  strongSkills: SkillScore[];
  evidenceCount: number;
}

export function scoreTracks(skills: SkillScore[]): TrackReadiness[] {
  const byId = new Map(skills.map((skill) => [skill.skillId, skill]));
  return careerTracks.map((track) => {
    const profile = Object.entries(trackProfiles[track]) as Array<[SkillId, number]>;
    const totalWeight = profile.reduce((sum, [, weight]) => sum + weight, 0);
    const relevant = profile.map(([skillId]) => byId.get(skillId)!).filter(Boolean);
    const score = pct(
      profile.reduce((sum, [skillId, weight]) => sum + (byId.get(skillId)?.score ?? 0) * weight, 0) / totalWeight,
    );
    const withEvidence = relevant.filter((skill) => skill.hasEvidence);
    return {
      track,
      label: trackLabels[track],
      score,
      coverage: pct((withEvidence.length / relevant.length) * 100),
      weakSkills: relevant.filter((skill) => skill.score < 60).sort((a, b) => a.score - b.score),
      strongSkills: relevant.filter((skill) => skill.score >= 60).sort((a, b) => b.score - a.score),
      evidenceCount: relevant.reduce((sum, skill) => sum + skill.evidenceCount, 0),
    };
  });
}

export interface RecommendedActivity {
  id: string;
  skillId: SkillId;
  title: string;
  reason: string;
  href: "/labs" | "/troubleshoot" | "/career-mode" | "/practice" | "/topics/$topicId";
  action: string;
  /** Set when href is the dynamic topic route. */
  topicId?: string;
}

/** Concrete next steps drawn from real content that has not produced evidence yet. */
export function recommendActivities(user: UserData, skills: SkillScore[]): RecommendedActivity[] {
  const weak = skills
    .filter((skill) => skill.score < 60)
    .sort((a, b) => a.score - b.score || Number(a.hasEvidence) - Number(b.hasEvidence));

  const doneLabIds = new Set(user.labAttempts.filter((a) => a.status !== "in_progress").map((a) => a.labId));
  const doneIncidentIds = new Set(user.incidentAttempts.filter((a) => a.status === "submitted").map((a) => a.incidentId));
  const doneTicketIds = new Set(user.ticketAttempts.filter((a) => a.status === "submitted").map((a) => a.ticketId));
  const scoredAssignmentIds = new Set(
    user.assignmentAttempts.filter((a) => a.score !== undefined).map((a) => a.assignmentId),
  );

  const out: RecommendedActivity[] = [];
  for (const skill of weak) {
    const skillId = skill.skillId;
    const reason = skill.hasEvidence
      ? `${skill.label} sits at ${skill.score}% from ${skill.evidenceCount} pieces of evidence.`
      : `${skill.label} has no recorded evidence yet.`;

    const lab = staticContent.labs.find(
      (l) => (labCategorySkills[l.category] ?? []).includes(skillId) && !doneLabIds.has(l.id),
    );
    if (lab) {
      out.push({ id: `rec-lab-${lab.id}`, skillId, title: lab.title, reason, href: "/labs", action: "Run this lab" });
      continue;
    }
    const incident = staticContent.incidents.find(
      (i) => (incidentCategorySkills[i.category] ?? []).includes(skillId) && !doneIncidentIds.has(i.id),
    );
    if (incident) {
      out.push({
        id: `rec-incident-${incident.id}`, skillId, title: incident.title, reason,
        href: "/troubleshoot", action: "Work this incident",
      });
      continue;
    }
    const ticket = staticContent.tickets.find(
      (t) => trackSkills[t.track].includes(skillId) && !doneTicketIds.has(t.id),
    );
    if (ticket) {
      out.push({
        id: `rec-ticket-${ticket.id}`, skillId, title: ticket.title, reason,
        href: "/career-mode", action: "Take this ticket",
      });
      continue;
    }
    const assignment = staticContent.assignments.find(
      (a) => (topicSkills[a.topicId] ?? []).includes(skillId) && !scoredAssignmentIds.has(a.id),
    );
    if (assignment) {
      out.push({
        id: `rec-assignment-${assignment.id}`, skillId, title: assignment.title, reason,
        href: "/practice", action: "Complete this assignment",
      });
      continue;
    }
    const topic = staticContent.topics.find((t) => (topicSkills[t.id] ?? []).includes(skillId));
    if (topic) {
      out.push({
        id: `rec-topic-${topic.id}`, skillId, title: topic.title, reason,
        href: "/topics/$topicId", topicId: topic.id, action: "Study and recall this topic",
      });
    }
  }
  return out;
}
