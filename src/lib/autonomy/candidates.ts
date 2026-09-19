import type { DomainPackage } from "@/domain/package";
import type { AutonomyFinding, ImprovementCandidate } from "./types";
import { AUTONOMY_RULES } from "./rules";
import { stableId } from "./health";

function nextPatch(version: string): string {
  const [major, minor, patch] = version.split(".").map(Number);
  return `${major || 0}.${minor || 0}.${(patch || 0) + 1}`;
}

/** Findings become immutable proposals. They do not modify or deploy content. */
export function createImprovementCandidates(pkg: DomainPackage, findings: AutonomyFinding[], now: Date = new Date()): ImprovementCandidate[] {
  const bySubject = new Map<string, AutonomyFinding[]>();
  for (const finding of findings) {
    const list = bySubject.get(finding.subjectId) ?? [];
    list.push(finding);
    bySubject.set(finding.subjectId, list);
  }
  return [...bySubject.entries()].map(([subjectId, related]) => {
    const action = related.some((finding) => finding.ruleId === AUTONOMY_RULES.prerequisiteWeakness)
      ? "strengthen-prerequisite"
      : related.some((finding) => finding.kind === "assessment") ? "repair-assessment" : "review-content";
    const candidateVersion = nextPatch(pkg.manifest.version);
    return {
      id: stableId("candidate", pkg.manifest.key, candidateVersion, subjectId, ...related.map((finding) => finding.id).sort()),
      domainId: pkg.manifest.id, packageKey: pkg.manifest.key, parentVersion: pkg.manifest.version, candidateVersion,
      findingIds: related.map((finding) => finding.id).sort(), targetIds: [subjectId], action,
      rationale: related.map((finding) => finding.detail).join(" "), status: "proposed", createdAt: now.toISOString(),
    } satisfies ImprovementCandidate;
  }).sort((a, b) => a.id.localeCompare(b.id));
}