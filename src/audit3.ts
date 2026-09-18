import { topics } from "@/data/static-content";
const by: Record<string,string[]> = {};
for (const t of topics) (by[t.certificationId] ??= []).push(`${t.id} (m${t.month})`);
for (const [k,v] of Object.entries(by)) console.log(`\n${k}:\n  ${v.join("\n  ")}`);
