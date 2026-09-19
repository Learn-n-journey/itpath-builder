/**
 * The audit on its own, with no tests and no gate.
 *
 * Run with: bun run audit
 * Pass section ids to narrow it: bun run audit topic-dns-fundamentals
 */
import { runContentAudit, summariseFindings } from "@/lib/quality/audit";
import { qualityRules } from "@/lib/quality/rules";

const topicIds = process.argv.slice(2).filter((value) => value.startsWith("topic-"));
const report = runContentAudit(topicIds.length ? { topicIds } : {});

console.log(`Rules applied: ${qualityRules.length}`);
console.log(
  `Scope: ${report.scope.topics} sections, ${report.scope.papers} papers, ${report.scope.questions} questions`,
);
console.log(`Blocking: ${report.blocking}   Warnings: ${report.warnings}`);

if (report.findings.length > 0) {
  console.log("\nFindings:");
  for (const line of summariseFindings(report.findings, 200)) console.log(`   ${line}`);
}

process.exit(report.passed ? 0 : 1);
