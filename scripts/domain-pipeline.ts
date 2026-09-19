/**
 * The domain pipeline.
 *
 * One command takes a brief for a new subject and walks the whole loop:
 *
 *   Generate -> QA audit -> Correct -> Retest -> Approve -> Monitor
 *
 * Generate writes the draft. The audit is independent: it reads the draft as
 * data and applies the rule book without ever asking the generator whether it
 * did well. Correction is targeted, one failing section at a time, using only
 * the findings against that section. The loop repeats until the draft is clean
 * or the attempt limit is reached, and every run is written to the same ledger
 * the quality gate uses, so a rule that keeps failing is visible over time.
 *
 * Run with: bun run domain -- brief.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { spawnSync } from "node:child_process";

import { auditDomainDraft, failingSections } from "@/lib/domain/validate";
import { emitPackage } from "@/lib/domain/emit.server";
import { buildPackageFromDraft } from "@/lib/domain/package-build";
import { auditPackage } from "@/lib/domain/package-audit";
import { activatePackage } from "@/lib/domain/activation.server";
import {
  correctSection,
  generateDefinition,
  generateQualifications,
  generateQuestionBank,
  generateSections,
  generateSources,
} from "@/lib/domain/generate.server";
import { summariseFindings } from "@/lib/quality/audit";
import type { DomainBrief, DomainDraft } from "@/lib/domain/brief";

const LEDGER = ".quality/domain-ledger.json";
const MAX_ROUNDS = 3;

function stage(name: string, detail: string): void {
  console.log(`[${name}] ${detail}`);
}

const briefPath = process.argv[2];
if (!briefPath || !existsSync(briefPath)) {
  console.error("Give me a brief file: bun run domain -- brief.json");
  console.error(
    'Shape: {"id":"auto-repair","field":"auto repair","awardingBody":"ASE","qualifications":["Brakes (A5)"],"sectionsPerQualification":8}',
  );
  process.exit(2);
}

const brief = JSON.parse(readFileSync(briefPath, "utf8")) as DomainBrief;

// 1. Generate.
stage("generate", `writing the ${brief.field} subject`);
const definition = await generateDefinition(brief);
const qualifications = await generateQualifications(brief);
stage("generate", `${qualifications.length} qualifications`);

const seeds = [];
let month = 1;
for (const qualification of qualifications) {
  const written = await generateSections(brief, qualification, month);
  month += Math.max(1, Math.ceil(written.length / 4));
  seeds.push(...written);
  stage("generate", `${qualification.title}: ${written.length} sections`);
}

const sources = await generateSources(brief, seeds);

// Question banks: written per section, a few sections at a time so a long
// subject does not take all day but the provider is never flooded.
const banks: NonNullable<DomainDraft["banks"]> = {};
const perSection = brief.questionsPerSection ?? 0;
if (perSection > 0) {
  const lanes = 6;
  const queue = [...seeds];
  await Promise.all(
    Array.from({ length: lanes }, async () => {
      for (;;) {
        const seed = queue.shift();
        if (!seed) return;
        banks[seed.slug] = await generateQuestionBank(brief, seed, perSection);
        stage("generate", `${seed.slug}: ${banks[seed.slug]!.length} questions`);
      }
    }),
  );
}

let draft: DomainDraft = { definition, qualifications, seeds, sources, banks };

// 2. Audit, 3. Correct, 4. Retest.
let audit = auditDomainDraft(draft);
stage("audit", `${audit.blocking} blocking, ${audit.warnings} warnings across ${audit.scope.sections} sections`);

let round = 0;
while (!audit.passed && round < MAX_ROUNDS) {
  round += 1;
  const broken = failingSections(audit.findings);
  stage("correct", `round ${round}: rewriting ${broken.length} sections`);

  const fixed = await Promise.all(
    draft.seeds.map(async (seed) => {
      if (!broken.includes(seed.slug)) return seed;
      const against = audit.findings.filter((finding) => finding.subjectId.startsWith(`section:${seed.slug}`));
      try {
        return await correctSection(brief, seed, against, round);
      } catch (error) {
        stage("correct", `${seed.slug} could not be rewritten: ${(error as Error).message}`);
        return seed;
      }
    }),
  );

  draft = { ...draft, seeds: fixed };
  audit = auditDomainDraft(draft);
  stage("retest", `${audit.blocking} blocking remain after round ${round}`);
}

// 5. Build the versioned package and audit the package itself.
const version = (brief as { version?: string }).version ?? "1.0.0";
const pkg = buildPackageFromDraft(draft, { version });
const packageAudit = auditPackage(pkg);
stage("qa", `package audit: ${packageAudit.blocking} blocking, ${packageAudit.warnings} warnings`);

const approved = audit.passed && packageAudit.passed;
stage("approve", approved ? "package is fit to activate" : "held back, written as a draft so it can be read and corrected");

// 6. Write it, isolated and versioned. Registration does not make it live.
const emitted = emitPackage({ ...pkg, manifest: { ...pkg.manifest, status: approved ? "approved" : "draft" } });
stage("approve", `written to ${emitted.folder}${emitted.registered ? " and registered" : ""}`);

// 7. Regression tests, then activation — only when nothing blocking is open.
let testsPassed = false;
let activation = { activated: false, reason: "not attempted" };
if (approved && !process.argv.includes("--no-activate")) {
  stage("retest", "running the regression tests");
  testsPassed = spawnSync("bun", ["run", "test"], { stdio: "inherit" }).status === 0;
  stage("retest", testsPassed ? "regression tests passed" : "regression tests failed");
  activation = activatePackage({
    key: pkg.manifest.key,
    blocking: audit.blocking + packageAudit.blocking,
    warnings: audit.warnings + packageAudit.warnings,
    testsPassed,
    note: `Activated by the domain pipeline after ${round} correction rounds.`,
  });
  stage("activate", activation.reason);
}

// 8. Monitor.
mkdirSync(".quality", { recursive: true });
const history = existsSync(LEDGER) ? (JSON.parse(readFileSync(LEDGER, "utf8")) as unknown[]) : [];
const byRule: Record<string, number> = {};
for (const finding of [...audit.findings, ...packageAudit.findings]) {
  byRule[finding.ruleId] = (byRule[finding.ruleId] ?? 0) + 1;
}

history.push({
  at: new Date().toISOString(),
  domainId: brief.id,
  packageKey: pkg.manifest.key,
  approved,
  activated: activation.activated,
  testsPassed,
  rounds: round,
  blocking: audit.blocking + packageAudit.blocking,
  warnings: audit.warnings + packageAudit.warnings,
  scope: pkg.manifest.scope,
  byRule,
});
writeFileSync(LEDGER, `${JSON.stringify(history.slice(-100), null, 2)}\n`);
stage("monitor", `run recorded in ${LEDGER}`);

const allFindings = [...audit.findings, ...packageAudit.findings];
if (allFindings.length) {
  console.log("\nFindings:");
  for (const line of summariseFindings(allFindings)) console.log(`   ${line}`);
}

console.log(
  activation.activated
    ? `\n${pkg.manifest.key} is live. Roll back with: bun run domain:rollback`
    : `\nNot live. Fix the blocking findings, regenerate, then: bun run domain:activate -- ${pkg.manifest.key}`,
);

process.exit(approved ? 0 : 1);
