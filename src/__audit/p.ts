import { topics } from "@/data/static-content";
import { getPracticeActivities } from "@/data/learning-content";
for (const t of topics) {
  const n = getPracticeActivities(t.id).length;
  if (n < 3) console.log(n, t.id);
}
