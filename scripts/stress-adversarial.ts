/**
 * `bun run stress` — attack the independent engines on purpose.
 *
 * Runs every injected defect against every registered subject, prints the
 * detection coverage by category, then walks the full
 * inject -> detect -> correct -> retest -> approve/reject loop.
 * Exits non-zero if any defect slips past or the loop ever approves damage.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { registeredKeys, findEntry } from "@/domain/registry";
import { measureCoverage, runLoops, summariseCoverage } from "@/lib/adversarial/harness";

const reports = [];
let failed = false;

for (const key of registeredKeys()) {
  const entry = findEntry(key)!;
  const pkg = entry.packageSync ?? (await entry.load!());
  const coverage = measureCoverage(pkg);
  for (const line of summariseCoverage(coverage)) console.log(line);

  const loops = runLoops(pkg);
  const undetected = loops.filter((loop) => !loop.detectedBeforeCorrection);
  const dirtyAfterRepair = loops.filter((loop) => !loop.cleanAfterCorrection);
  console.log(
    `  loop: ${loops.length} walks, ${loops.filter((l) => l.decisionBeforeCorrection === "reject").length} damaged packages rejected, ` +
      `${loops.filter((l) => l.decisionAfterCorrection === "approve").length} repaired packages approved.`,
  );
  if (undetected.length > 0) {
    failed = true;
    console.log(`  FAIL: defect slipped past QA: ${undetected.map((l) => l.injectionId).join(", ")}`);
  }
  if (dirtyAfterRepair.length > 0) {
    failed = true;
    console.log(`  FAIL: correction left damage behind: ${dirtyAfterRepair.map((l) => l.injectionId).join(", ")}`);
  }
  if (coverage.missed > 0) failed = true;
  reports.push({ coverage, loops });
}

mkdirSync(".quality", { recursive: true });
writeFileSync(".quality/adversarial-report.json", `${JSON.stringify(reports, null, 2)}\n`);
console.log(failed ? "Adversarial stress test: FAILED" : "Adversarial stress test: passed");
process.exit(failed ? 1 : 0);
