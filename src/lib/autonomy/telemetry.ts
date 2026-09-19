import type { DomainPackage, DomainSection } from "@/domain/package";
import type { LearnerSignal } from "@/lib/app-data/types";
import type { AutonomyThresholds, TelemetryAggregate } from "./types";

export interface ObservedTelemetry {
  packageKey: string;
  signalCount: number;
  bySection: Map<string, TelemetryAggregate>;
}

function aliases(pkg: DomainPackage, section: DomainSection): string[] {
  return [section.id, section.slug, `${pkg.manifest.id}:section:${section.slug}`];
}

function emptyAggregate(): TelemetryAggregate {
  return {
    evidence: 0,
    gradedEvidence: 0,
    successes: 0,
    failures: 0,
    retries: 0,
    completionRate: 0,
    mastery: 0,
    retention: 0,
    timeToMasteryMs: null,
    misconceptionCounts: {},
    firstEvidenceAt: null,
    lastEvidenceAt: null,
  };
}

function aggregate(signals: LearnerSignal[], thresholds: AutonomyThresholds): TelemetryAggregate {
  if (signals.length === 0) return emptyAggregate();
  const ordered = [...signals].sort((a, b) => a.at.localeCompare(b.at));
  const graded = ordered.filter((signal) => signal.correct !== undefined || signal.score !== undefined);
  const success = (signal: LearnerSignal) => signal.correct === true || (signal.score ?? 0) >= thresholds.masteryTarget;
  const successes = graded.filter(success).length;
  const failures = graded.length - successes;
  const misconceptionCounts: Record<string, number> = {};
  for (const signal of graded) {
    if (!signal.errorTag) continue;
    misconceptionCounts[signal.errorTag] = (misconceptionCounts[signal.errorTag] ?? 0) + 1;
  }
  const firstMastery = graded.findIndex((signal, index) => success(signal) && graded.slice(Math.max(0, index - 1), index + 1).every(success));
  const firstAt = ordered[0]?.at ?? null;
  const masteryAt = firstMastery >= 0 ? graded[firstMastery]?.at ?? null : null;
  const recent = graded.slice(-5);
  const recentSuccesses = recent.filter(success).length;

  return {
    evidence: ordered.length,
    gradedEvidence: graded.length,
    successes,
    failures,
    retries: Math.max(0, graded.length - 1),
    completionRate: graded.length === 0 ? 0 : successes / graded.length,
    mastery: graded.length === 0 ? 0 : successes / graded.length,
    retention: recent.length === 0 ? 0 : recentSuccesses / recent.length,
    timeToMasteryMs: firstAt && masteryAt ? Math.max(0, Date.parse(masteryAt) - Date.parse(firstAt)) : null,
    misconceptionCounts,
    firstEvidenceAt: firstAt,
    lastEvidenceAt: ordered.at(-1)?.at ?? null,
  };
}

/** Observe immutable learner evidence and map it through package-owned section identities. */
export function observeTelemetry(
  pkg: DomainPackage,
  evidence: LearnerSignal[],
  thresholds: AutonomyThresholds,
): ObservedTelemetry {
  const aliasToSection = new Map<string, string>();
  for (const section of pkg.sections) {
    for (const alias of aliases(pkg, section)) aliasToSection.set(alias, section.id);
  }
  const grouped = new Map<string, LearnerSignal[]>();
  for (const signal of evidence) {
    const sectionId = aliasToSection.get(signal.topicId);
    if (!sectionId) continue;
    const list = grouped.get(sectionId) ?? [];
    list.push(signal);
    grouped.set(sectionId, list);
  }
  return {
    packageKey: pkg.manifest.key,
    signalCount: [...grouped.values()].reduce((total, signals) => total + signals.length, 0),
    bySection: new Map(pkg.sections.map((section) => [section.id, aggregate(grouped.get(section.id) ?? [], thresholds)])),
  };
}