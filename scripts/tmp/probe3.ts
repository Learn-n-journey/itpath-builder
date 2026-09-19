import { findEntry } from "@/domain/registry";
import { inspect } from "@/lib/adversarial/harness";
const pkg = await findEntry("it-cybersecurity@1.0.0")!.load!();
const b=inspect(pkg).filter(f=>f.severity==="blocking");
console.log("blocking",b.length);
for(const f of b) console.log(f.ruleId, f.subjectId, "::", f.detail);
