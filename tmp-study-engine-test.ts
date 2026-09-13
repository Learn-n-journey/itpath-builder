import { generateStudyPlan } from "./src/lib/study-engine";
import type { UserData } from "./src/lib/app-data/types";
import { createDefaultUserData, defaultSettings } from "./src/lib/app-data/defaults";

const base: UserData = {
  ...createDefaultUserData(),
  settings: {
    ...defaultSettings,
    sessionLengthMinutes: 45,
  },
};

// Test with default user (no activity) at 45 min
const plan1 = generateStudyPlan(base, 45);
console.log("target:", plan1.targetMinutes);
console.log("scheduled:", plan1.tasks.reduce((s, t) => s + t.plannedMinutes, 0));
console.log("tasks:", plan1.tasks.length);
console.log("task minutes:", plan1.tasks.map((t) => t.plannedMinutes));
console.log("match:", plan1.targetMinutes === plan1.tasks.reduce((s, t) => s + t.plannedMinutes, 0));

// Test standard durations
for (const target of [30, 60, 90, 120]) {
  const plan = generateStudyPlan(base, target);
  const scheduled = plan.tasks.reduce((s, t) => s + t.plannedMinutes, 0);
  console.log(`target=${target}, scheduled=${scheduled}, match=${target === scheduled}`);
}
