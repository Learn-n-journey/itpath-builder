import { registeredKeys, findEntry } from "@/domain/registry";
import { inspect } from "@/lib/adversarial/harness";
for (const key of registeredKeys()){
  const e=findEntry(key)!; const pkg=e.packageSync ?? await e.load!();
  const f=inspect(pkg);
  const blocking=f.filter(x=>x.severity==="blocking");
  console.log(key,"manifestKeys",Object.keys(pkg.manifest).join(","),"findings",f.length,"blocking",blocking.length);
  const byRule=new Map<string,number>(); for(const x of blocking) byRule.set(x.ruleId,(byRule.get(x.ruleId)??0)+1);
  console.log([...byRule].map(([r,c])=>`${r}=${c}`).join(" "));
  console.log(blocking.slice(0,6).map(x=>`${x.ruleId} ${x.subjectId}: ${x.detail}`).join("\n"));
  console.log("lesson1 body len", pkg.lessons[1]?.body.length, "sec0 objectives", pkg.sections[0]?.objectiveIds);
}
