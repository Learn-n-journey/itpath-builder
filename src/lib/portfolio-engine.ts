import { staticContent } from "@/data/static-content";
import type { Lab, LabAttempt, PortfolioProject, UserData } from "@/lib/app-data/types";
import { domain } from "@/domain/active";

/** A lab attempt only counts as evidence when the learner actually finished it. */
export function isCompletedLabAttempt(attempt: LabAttempt): boolean {
  return attempt.status === "completed" || attempt.status === "mastered";
}

const labSkills: Record<Lab["category"], string[]> = {
  hardware: ["Hardware", "Documentation"],
  windows: ["Windows", "Troubleshooting"],
  networking: ["Networking", "Troubleshooting"],
  linux: ["Linux", "Command line"],
  powershell: ["PowerShell", "Windows"],
  bash: ["Bash", "Linux"],
  dns: ["Networking", "DNS"],
  security: ["Security", "Documentation"],
  cloud: ["Cloud", "Security"],
};

/** Pre-populates portfolio fields from a genuinely completed lab attempt. */
export function projectFromLabAttempt(
  lab: Lab,
  attempt: LabAttempt,
  id: string = crypto.randomUUID(),
): PortfolioProject {
  const now = new Date().toISOString();
  const done = attempt.completedAt ?? attempt.submittedAt ?? now;
  const steps = lab.instructions.slice(0, 4).join(" ");
  return {
    id,
    title: lab.title,
    summary: lab.objective,
    problem: lab.objective,
    approach: `${lab.environment} ${steps}`.trim(),
    skills: labSkills[lab.category] ?? [],
    tools: [lab.environment],
    result: `${lab.expectedResult} Scored ${attempt.score} of ${attempt.maxScore} on the lab checklist.`,
    evidence: `${domain.appName} ${domain.vocabulary.lab} attempt ${attempt.id}, checklist confirmed by the learner and reflection recorded. ${domain.appName} did not inspect an external environment.`,
    date: done.slice(0, 10),
    difficulty: lab.difficulty,
    topicIds: [lab.topicId],
    labId: lab.id,
    labAttemptId: attempt.id,
    source: "lab",
    createdAt: now,
    updatedAt: now,
  };
}

/** Completed lab attempts that have no portfolio entry yet. */
export function availableLabEvidence(user: UserData) {
  return user.labAttempts
    .filter(isCompletedLabAttempt)
    .filter((attempt) => !user.portfolio.some((p) => p.labAttemptId === attempt.id))
    .map((attempt) => ({
      attempt,
      lab: staticContent.labs.find((lab) => lab.id === attempt.labId),
    }))
    .filter((entry): entry is { attempt: LabAttempt; lab: Lab } => Boolean(entry.lab));
}

export function emptyProject(id: string = crypto.randomUUID()): PortfolioProject {
  const now = new Date().toISOString();
  return {
    id,
    title: "",
    summary: "",
    problem: "",
    approach: "",
    skills: [],
    tools: [],
    result: "",
    evidence: "",
    date: now.slice(0, 10),
    difficulty: "standard",
    topicIds: [],
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };
}

export function projectToMarkdown(project: PortfolioProject): string {
  const list = (values: string[]) => (values.length ? values.join(", ") : "-");
  return [
    `## ${project.title || "Untitled project"}`,
    ``,
    `- **Date:** ${project.date}`,
    `- **Difficulty:** ${project.difficulty}`,
    `- **Skills:** ${list(project.skills)}`,
    `- **Tools:** ${list(project.tools)}`,
    ``,
    `**Problem**`,
    project.problem || "-",
    ``,
    `**Approach**`,
    project.approach || "-",
    ``,
    `**Result**`,
    project.result || "-",
    ``,
    `**Evidence**`,
    project.evidence || "-",
    ``,
  ].join("\n");
}

export function portfolioToMarkdown(projects: PortfolioProject[]): string {
  return [`# ${domain.appName} Portfolio`, ``, ...projects.map(projectToMarkdown)].join("\n");
}

export function downloadFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
