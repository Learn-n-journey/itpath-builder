/**
 * The quality gate.
 *
 * One command walks the whole loop and decides whether the material may ship:
 *
 *   Generate -> Test -> Audit -> Correct -> Retest -> Approve -> Monitor -> Improve
 *
 * Generate draws fresh papers from the live engines, Test runs the automated
 * suite, Audit applies the rule book, Correct is the engines' own repair pass
 * seen through a second draw, Retest confirms the repair held, Approve is the
 * exit code, Monitor writes the run to a ledger, and Improve reports which
 * rules keep failing across runs so the worst one can be worked on first.
 *
 * Run with: bun run gate
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { runContentAudit, summariseFindings, type AuditReport } from "@/lib/quality/audit";
import { qualityRules } from "@/lib/quality/rules";

const LEDGER = ".quality/ledger.json";
const REPORT = ".quality/last-report.json";

interface LedgerRun {
  at: string;
  passed: boolean;
  blocking: number;
  warnings: number;
  scope: AuditReport["scope"];
  /** How many findings each rule produced, so repeats are visible over time. */
  byRule: Record<string, number>;
  testsPassed: boolean;
}

function readLedger(): LedgerRun[] {
  if (!existsSync(LEDGER)) return [];
  try {
    return JSON.parse(readFileSync(LEDGER, "utf8")) as LedgerRun[];
  } catch {
    return [];
  }
}

function countByRule(report: AuditReport): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const finding of report.findings) {
    counts[finding.ruleId] = (counts[finding.ruleId] ?? 0) + 1;
  }
  return counts;
}

function stage(name: string, detail: string): void {
  console.log(`[${name}] ${detail}`);
}

// 1. Generate and 2. Test.
stage("generate", "drawing fresh papers from the live engines");
stage("test", "running the automated suite");
const tests = spawnSync("bunx", ["vitest", "run"], { stdio: "inherit" });
const testsPassed = tests.status === 0;

// 3. Audit.
stage("audit", `applying ${qualityRules.length} rules to the whole curriculum`);
const first = runContentAudit();
stage("audit", `${first.blocking} blocking, ${first.warnings} warnings across ${first.scope.papers} papers`);

// 4. Correct and 5. Retest. The engines repair a paper as they build it, so a
// second, independent draw shows whether the fault was the material or the draw.
let report = first;
if (!first.passed) {
  const blocking = first.findings.filter((finding) => finding.severity === "blocking");
  const redrawable = blocking.filter(
    (finding) => finding.ruleId.startsWith("papers.") || finding.subjectId.startsWith("quiz:") || finding.subjectId.startsWith("exam:"),
  );
  const deterministic = blocking.filter((finding) => !redrawable.includes(finding));

  if (redrawable.length > 0) {
    stage("correct", `redrawing assessment papers for ${redrawable.length} draw-related blocker(s)`);
    report = runContentAudit({ papersEach: 3 });
    stage("retest", `${report.blocking} blocking remain after an independent redraw`);
  } else {
    stage("correct", `skipped redraw: all ${deterministic.length} blocker(s) are deterministic content or structure findings`);
    stage("retest", "not applicable; these findings require source material or rule changes");
  }
}

// 6. Approve.
const approved = report.passed && testsPassed;
stage("approve", approved ? "material is fit to publish" : "held back");

// 7. Monitor.
mkdirSync(".quality", { recursive: true });
const run: LedgerRun = {
  at: new Date().toISOString(),
  passed: approved,
  blocking: report.blocking,
  warnings: report.warnings,
  scope: report.scope,
  byRule: countByRule(report),
  testsPassed,
};
const ledger = [...readLedger(), run].slice(-100);
writeFileSync(LEDGER, `${JSON.stringify(ledger, null, 2)}\n`);
writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
stage("monitor", `run recorded in ${LEDGER}`);

// 8. Improve.
const totals: Record<string, number> = {};
for (const entry of ledger) {
  for (const [ruleId, count] of Object.entries(entry.byRule)) {
    totals[ruleId] = (totals[ruleId] ?? 0) + count;
  }
}
const worst = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
if (worst.length === 0) {
  stage("improve", "nothing has failed in the recorded history");
} else {
  stage("improve", "rules failing most often across recorded runs:");
  for (const [ruleId, count] of worst) console.log(`   ${ruleId}: ${count}`);
}

if (report.findings.length > 0) {
  console.log("\nFindings:");
  for (const line of summariseFindings(report.findings)) console.log(`   ${line}`);
}

process.exit(approved ? 0 : 1);
