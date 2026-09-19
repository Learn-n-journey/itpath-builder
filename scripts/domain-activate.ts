/**
 * Activation and rollback from the command line.
 *
 *   bun run domain:activate -- it-cybersecurity@1.0.0
 *   bun run domain:rollback
 *
 * Activation re-runs the package audit and the regression tests first and
 * refuses while anything blocking is open. Every decision is written to
 * .quality/domain-activations.json.
 */
import { spawnSync } from "node:child_process";

import { activatePackage, currentActiveKey, readActivationLog, rollback } from "@/lib/domain/activation.server";
import { auditPackage } from "@/lib/domain/package-audit";
import { findEntry } from "@/domain/registry";
import { summariseFindings } from "@/lib/quality/audit";

const args = process.argv.slice(2);
const wantsRollback = args.includes("--rollback") || process.env["DOMAIN_ROLLBACK"] === "1";

function step(name: string, detail: string): void {
  console.log(`[${name}] ${detail}`);
}

if (wantsRollback) {
  const result = rollback();
  step("rollback", result.reason);
  process.exit(result.activated ? 0 : 1);
}

const key = args.find((arg) => !arg.startsWith("-"));
if (!key) {
  console.error(`Give me a package key. Active now: ${currentActiveKey()}`);
  console.error(`History: ${readActivationLog().length} recorded changes.`);
  process.exit(2);
}

const entry = findEntry(key);
if (!entry?.load) {
  console.error(`${key} is not registered, or has no package to load.`);
  process.exit(2);
}

step("validate", `loading ${key}`);
const pkg = await entry.load();

step("qa", "running the independent package audit");
const audit = auditPackage(pkg);
step("qa", `${audit.blocking} blocking, ${audit.warnings} warnings`);
if (audit.findings.length) for (const line of summariseFindings(audit.findings)) console.log(`   ${line}`);

step("retest", "running the regression tests");
const tests = spawnSync("bun", ["run", "test"], { stdio: "inherit" });
const testsPassed = tests.status === 0;
step("retest", testsPassed ? "regression tests passed" : "regression tests failed");

const result = activatePackage({
  key,
  blocking: audit.blocking,
  warnings: audit.warnings,
  testsPassed,
  note: `Activated by domain:activate with ${audit.warnings} warnings.`,
});

step("activate", result.reason);
if (!result.activated) {
  console.error("Nothing changed. The previous subject is still live.");
  process.exit(1);
}
console.log(`Roll back with: bun run domain:rollback (returns to ${result.previousKey})`);
