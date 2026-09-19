/**
 * `bun run stress` — attack the independent engines on purpose.
 *
 * Runs every injected defect against every registered subject, prints the
 * detection coverage by category, then walks the full
 * inject -> detect -> correct -> retest -> approve/reject loop.
 * Exits non-zero if any defect slips past or the loop ever approves damage.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { listPackages } from "@/domain/registry";
import { measureCoverage, runLoops, summariseCoverage } from "@/lib/adversarial/harness";

const reports = [];
let failed = false;

for (const entry of listPackages()) {
  const pkg = entry.pkg;
  const coverage = measureCoverage(pkg);
  for (const line of summariseCoverage(coverage)) console.log(line);

  const loops = runLoops(pkg);
  const approvedDamage = loops.filter((loop) => loop.decisionBeforeCorrection === "approve" && loop.detectedBeforeCorrection);
  const rejectedRepair = loops.filter((loop) => loop.decisionAfterCorrection === "reject");
  console.log(
    `  loop: ${loops.length} walks, ${loops.filter((l) => l.decisionBeforeCorrection === "reject").length} damaged packages rejected, ` +
      `${loops.filter((l) => l.decisionAfterCorrection === "approve").length} repaired packages approved.`,
  );
  if (approvedDamage.length > 0) {
    failed = true;
    console.log(`  FAIL: damage approved for ${approvedDamage.map((l) => l.injectionId).join(", ")}`);
  }
  if (rejectedRepair.length > 0 && coverage.packageKey.startsWith("it-")) {
    failed = true;
    console.log(`  FAIL: repaired package rejected for ${rejectedRepair.map((l) => l.injectionId).join(", ")}`);
  }
  if (coverage.missed > 0) failed = true;
  reports.push({ coverage, loops });
}

mkdirSync(".quality", { recursive: true });
writeFileSync(".quality/adversarial-report.json", `${JSON.stringify(reports, null, 2)}\n`);
console.log(failed ? "Adversarial stress test: FAILED" : "Adversarial stress test: passed");
process.exit(failed ? 1 : 0);
