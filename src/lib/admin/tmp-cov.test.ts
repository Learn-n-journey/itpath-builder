import { test } from "vitest";
import { coursePack } from "@/content/course-pack";
import { courseCoverage } from "@/lib/admin/concept-coverage";

test("counts", () => {
  const r = courseCoverage(coursePack);
  const elsewhere = r.findings.filter((f) => f.reviewKind === "elsewhere").length;
  console.log("pass", r.pass, "review", r.review, "(elsewhere", elsewhere, ") fail", r.fail);
  // duplicates
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  for (const s of coursePack.sections) {
    const seen = new Map<string, string[]>();
    for (const q of coursePack.sectionQuestionPool(s.id)) {
      const k = norm(q.prompt);
      seen.set(k, [...(seen.get(k) ?? []), q.id]);
    }
    for (const [k, ids] of seen) if (ids.length > 1) console.log("DUP", s.id, ids.join(","), k.slice(0, 90));
  }
}, 300000);
