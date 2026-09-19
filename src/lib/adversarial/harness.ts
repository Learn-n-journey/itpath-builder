/**
 * The stress test itself.
 *
 * A healthy subject is damaged on purpose, one defect at a time, and handed to
 * the ordinary independent engines — the same ones the real pipeline uses. The
 * harness records only what those engines say. It never repairs by guessing:
 * correction restores the damaged parts from the untouched original, so both
 * halves of the loop are as deterministic as each other.
 *
 * No AI takes part. Nothing here knows what subject is being taught.
 */
import { auditPackage } from "@/lib/domain/package-audit";
import { decidePromotion, validateCandidate } from "@/lib/autonomy/validation";
import type { DomainPackage } from "@/domain/package";
import type { Finding } from "@/lib/quality/types";
import type { ImprovementCandidate } from "@/lib/autonomy/types";
import { injections } from "./injections";
import { DEFECT_CATEGORIES } from "./types";
import type { CategoryCoverage, CoverageReport, DetectionOutcome, Injection, LoopResult } from "./types";

export { injections } from "./injections";

const fingerprint = (finding: Finding) => `${finding.ruleId}|${finding.subjectId}|${finding.detail}`;

/** Everything the independent engines say about a package, as plain findings. */
export function inspect(pkg: DomainPackage): Finding[] {
  return auditPackage(pkg).findings;
}

/**
 * What the engines say about a damaged package that they did not already say
 * about the healthy one. Only new complaints count as a detection.
 */
export function detect(healthy: Finding[], damaged: Finding[]): Finding[] {
  const before = new Set(healthy.map(fingerprint));
  return damaged.filter((finding) => !before.has(fingerprint(finding)));
}

export function runInjection(pkg: DomainPackage, baseline: Finding[], injection: Injection): DetectionOutcome {
  const damaged = injection.apply(pkg);
  const newFindings = detect(baseline, inspect(damaged));
  return {
    injectionId: injection.id,
    category: injection.category,
    description: injection.description,
    detected: newFindings.length > 0,
    rulesFired: [...new Set(newFindings.map((finding) => finding.ruleId))].sort(),
    subjectIds: [...new Set(newFindings.map((finding) => finding.subjectId))].sort().slice(0, 5),
    newFindings,
  };
}

export function measureCoverage(pkg: DomainPackage, list: Injection[] = injections): CoverageReport {
  const baseline = inspect(pkg);
  const outcomes = list.map((injection) => runInjection(pkg, baseline, injection));

  const byCategory: CategoryCoverage[] = DEFECT_CATEGORIES.map((category) => {
    const mine = outcomes.filter((outcome) => outcome.category === category);
    const detected = mine.filter((outcome) => outcome.detected);
    return {
      category,
      total: mine.length,
      detected: detected.length,
      percentage: mine.length === 0 ? 0 : Math.round((detected.length / mine.length) * 100),
      missed: mine.filter((outcome) => !outcome.detected).map((outcome) => outcome.injectionId),
    };
  });

  const detected = outcomes.filter((outcome) => outcome.detected).length;
  return {
    startedAt: new Date().toISOString(),
    packageKey: `${pkg.manifest.id}@${pkg.manifest.version}`,
    total: outcomes.length,
    detected,
    missed: outcomes.length - detected,
    percentage: outcomes.length === 0 ? 0 : Math.round((detected / outcomes.length) * 100),
    byCategory,
    outcomes,
    weaknesses: byCategory
      .filter((row) => row.total > 0 && row.detected < row.total)
      .map((row) => `${row.category}: ${row.total - row.detected} of ${row.total} defects slipped past the engines.`),
  };
}

function candidateFor(pkg: DomainPackage, injectionId: string): ImprovementCandidate {
  return {
    id: `adversarial:${injectionId}`,
    domainId: pkg.manifest.id,
    packageKey: `${pkg.manifest.id}@${pkg.manifest.version}`,
    parentVersion: pkg.manifest.version,
    candidateVersion: `${pkg.manifest.version}+stress`,
    findingIds: [],
    targetIds: [],
    action: "review-content",
    rationale: `Adversarial stress injection ${injectionId}.`,
    status: "proposed",
    createdAt: "1970-01-01T00:00:00.000Z",
  };
}

/**
 * The whole loop for one defect:
 * inject -> detect -> decide -> correct from the original -> retest -> decide.
 * A correct system rejects the damaged package and approves the repaired one.
 */
export function runLoop(pkg: DomainPackage, injection: Injection): LoopResult {
  const baseline = inspect(pkg);
  const damaged = injection.apply(pkg);
  const damagedFindings = inspect(damaged);
  const introduced = detect(baseline, damagedFindings);

  const candidate = candidateFor(pkg, injection.id);
  const before = decidePromotion(candidate, validateCandidate(damaged, true));

  // Correction is a restore, never a guess: the untouched original is the fix.
  const corrected = structuredClone(pkg);
  const after = decidePromotion(candidate, validateCandidate(corrected, true));
  const remaining = detect(baseline, inspect(corrected));

  return {
    injectionId: injection.id,
    category: injection.category,
    detectedBeforeCorrection: introduced.length > 0,
    decisionBeforeCorrection: before.action,
    decisionAfterCorrection: after.action,
    cleanAfterCorrection: remaining.length === 0,
    reasonsBefore: before.reasons,
    reasonsAfter: after.reasons,
  };
}

export function runLoops(pkg: DomainPackage, list: Injection[] = injections): LoopResult[] {
  return list.map((injection) => runLoop(pkg, injection));
}

/** A short, readable account of a coverage run. */
export function summariseCoverage(report: CoverageReport): string[] {
  const lines = [
    `${report.packageKey}: ${report.detected}/${report.total} injected defects detected (${report.percentage}%).`,
    ...report.byCategory
      .filter((row) => row.total > 0)
      .map((row) => `  ${row.category.padEnd(22)} ${row.detected}/${row.total} (${row.percentage}%)`),
  ];
  if (report.weaknesses.length > 0) lines.push("Weaknesses:", ...report.weaknesses.map((line) => `  ${line}`));
  return lines;
}
