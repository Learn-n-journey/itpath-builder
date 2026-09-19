/**
 * Independent QA for a whole domain package.
 *
 * The draft auditor in `validate.ts` checks a freshly generated subject. This
 * checks the assembled package: ids stable and unique, every reference
 * resolving, no orphan sections, questions with exactly one answer, sources
 * present, and the manifest matching what is actually inside. It never asks
 * the generator anything and is run again after correction and before
 * activation.
 */
import { getRule } from "@/lib/quality/rules";
import { measure } from "@/domain/package";
import type { Finding } from "@/lib/quality/types";
import type { DomainPackage } from "@/domain/package";
import { validateExactAssessmentSizes } from "@/lib/autonomy/assessment-size";

function note(out: Finding[], ruleId: string, subjectId: string, detail: string): void {
  const rule = getRule(ruleId);
  out.push({ ruleId, severity: rule?.severity ?? "blocking", subjectId, detail });
}

export interface PackageAudit {
  findings: Finding[];
  blocking: number;
  warnings: number;
  passed: boolean;
  scope: ReturnType<typeof measure>;
}

export function auditPackage(pkg: DomainPackage): PackageAudit {
  const findings: Finding[] = [];
  const sectionIds = new Set(pkg.sections.map((section) => section.id));
  const qualificationIds = new Set(pkg.qualifications.map((q) => q.id));
  const seenIds = new Set<string>();

  const unique = (id: string, subjectId: string) => {
    if (seenIds.has(id)) {
      note(findings, "domain.section-id-unique", subjectId, `The id "${id}" is used more than once in this package.`);
    }
    seenIds.add(id);
  };

  if (!pkg.definition.id || pkg.definition.id !== pkg.manifest.id) {
    note(findings, "domain.definition-complete", "package:manifest", "The manifest id and the definition id disagree.");
  }
  if (!/^\d+\.\d+\.\d+$/.test(pkg.manifest.version)) {
    note(findings, "domain.definition-complete", "package:manifest", `Version "${pkg.manifest.version}" is not a three-part version.`);
  }

  if (pkg.qualifications.length === 0) {
    note(findings, "domain.qualification-has-sections", "package:qualifications", "The package has no qualifications.");
  }

  for (const qualification of pkg.qualifications) {
    unique(qualification.id, `qualification:${qualification.id}`);
    if (qualification.objectives.length < 3) {
      note(
        findings,
        "domain.qualification-has-objectives",
        `qualification:${qualification.id}`,
        `${qualification.title} has ${qualification.objectives.length} objectives.`,
      );
    }
    if (!pkg.sections.some((section) => section.qualificationId === qualification.id)) {
      note(
        findings,
        "domain.qualification-has-sections",
        `qualification:${qualification.id}`,
        `${qualification.title} has no sections teaching it.`,
      );
    }
  }

  for (const section of pkg.sections) {
    unique(section.id, `section:${section.slug}`);
    if (!qualificationIds.has(section.qualificationId)) {
      note(
        findings,
        "domain.section-belongs-to-qualification",
        `section:${section.slug}`,
        `${section.title} points at qualification "${section.qualificationId}", which is not in this package.`,
      );
    }
    if (!pkg.lessons.some((lesson) => lesson.sectionId === section.id)) {
      note(findings, "structure.topic-has-lesson", `section:${section.slug}`, `${section.title} has no lesson.`);
    }
    if (!pkg.questions.some((question) => question.sectionId === section.id)) {
      note(findings, "domain.section-has-recall", `section:${section.slug}`, `${section.title} has nothing to answer.`);
    }
    if (!pkg.sources.some((source) => source.sectionId === section.id)) {
      note(findings, "domain.section-has-sources", `section:${section.slug}`, `${section.title} cites no outside source.`);
    }
  }

  for (const link of pkg.prerequisites) {
    if (!sectionIds.has(link.sectionId) || !sectionIds.has(link.requiresSectionId)) {
      note(
        findings,
        "structure.prerequisites-resolve",
        `prerequisite:${link.sectionId}`,
        `A prerequisite points at a section that is not in this package.`,
      );
    }
  }

  for (const question of pkg.questions) {
    if (!sectionIds.has(question.sectionId)) {
      note(findings, "domain.section-id-unique", `question:${question.id}`, "The question belongs to no section in this package.");
      continue;
    }
    if (question.choices.length < 2) continue;
    if (question.answerIndex < 0 || question.answerIndex >= question.choices.length) {
      note(findings, "questions.sound", `question:${question.id}`, "The marked answer is not one of the options.");
    }
    if (new Set(question.choices.map((choice) => choice.trim().toLowerCase())).size !== question.choices.length) {
      note(findings, "questions.sound", `question:${question.id}`, "Two options say the same thing.");
    }
  }

  for (const assessment of pkg.assessments) {
    if (assessment.coversQualificationIds.length === 0) {
      note(findings, "domain.qualification-has-sections", `assessment:${assessment.id}`, `${assessment.title} proves no qualification.`);
    }
    for (const covered of assessment.coversQualificationIds) {
      if (!qualificationIds.has(covered)) {
        note(
          findings,
          "domain.qualification-has-sections",
          `assessment:${assessment.id}`,
          `${assessment.title} names qualification "${covered}", which is not in this package.`,
        );
      }
    }
  }

  const exactSizes = validateExactAssessmentSizes(pkg);
  for (const failure of exactSizes.failures) {
    note(
      findings,
      "papers.stage-exam-whole",
      `assessment:${failure.assessmentId}`,
      `The assessment declares ${failure.actual} questions; this package requires exactly ${failure.expected}.`,
    );
  }

  // Beyond shape: is the material fit to teach? Deterministic checks only.
  findings.push(...extraPackageFindings(pkg));

  const counted = measure(pkg);
  for (const [name, value] of Object.entries(counted)) {
    if ((pkg.manifest.scope as Record<string, number>)[name] !== value) {
      note(
        findings,
        "domain.definition-complete",
        "package:manifest",
        `The manifest says ${name}: ${(pkg.manifest.scope as Record<string, number>)[name]}, the package holds ${value}.`,
      );
    }
  }

  const blocking = findings.filter((finding) => finding.severity === "blocking").length;
  return { findings, blocking, warnings: findings.length - blocking, passed: blocking === 0, scope: counted };
}
