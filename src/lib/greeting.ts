/** Time-of-day greeting lines. Written text, no AI call, so it renders instantly. */

const MORNING = [
  "Good morning",
  "Morning",
  "Fresh start this morning",
  "Good morning — early focus pays off",
];

const AFTERNOON = [
  "Good afternoon",
  "Afternoon",
  "Good afternoon — nice time for a session",
  "Afternoon check-in",
];

const EVENING = [
  "Good evening",
  "Evening",
  "Good evening — a short session still counts",
  "Evening study time",
];

const LATE_NIGHT = [
  "Burning the midnight oil",
  "Late-night session",
  "Still up and studying",
  "Late one tonight",
];

export type TimeBucket = "morning" | "afternoon" | "evening" | "late";

export function timeBucket(date: Date = new Date()): TimeBucket {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "late";
}

function linesFor(bucket: TimeBucket): string[] {
  switch (bucket) {
    case "morning":
      return MORNING;
    case "afternoon":
      return AFTERNOON;
    case "evening":
      return EVENING;
    default:
      return LATE_NIGHT;
  }
}

/** Stable within a day and time bucket, so it doesn't reshuffle while you browse. */
export function greetingFor(firstName: string, date: Date = new Date()): string {
  const bucket = timeBucket(date);
  const lines = linesFor(bucket);
  const daySeed =
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate() + bucket.length;
  const line = lines[daySeed % lines.length] ?? lines[0]!;
  const name = firstName.trim();
  return name ? `${line}, ${name}` : line;
}
