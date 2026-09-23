export type VisualAccent = "cyan" | "blue" | "violet" | "green" | "amber" | "orange" | "coral" | "muted";

export const accentText: Record<VisualAccent, string> = {
  cyan: "text-feature-cyan",
  blue: "text-feature-blue",
  violet: "text-feature-violet",
  green: "text-feature-green",
  amber: "text-feature-amber",
  orange: "text-feature-orange",
  coral: "text-feature-coral",
  muted: "text-muted-foreground",
};

export const accentSurface: Record<VisualAccent, string> = {
  cyan: "bg-feature-cyan/10 text-feature-cyan ring-feature-cyan/20",
  blue: "bg-feature-blue/10 text-feature-blue ring-feature-blue/20",
  violet: "bg-feature-violet/10 text-feature-violet ring-feature-violet/20",
  green: "bg-feature-green/10 text-feature-green ring-feature-green/20",
  amber: "bg-feature-amber/10 text-feature-amber ring-feature-amber/20",
  orange: "bg-feature-orange/10 text-feature-orange ring-feature-orange/20",
  coral: "bg-feature-coral/10 text-feature-coral ring-feature-coral/20",
  muted: "bg-secondary text-muted-foreground ring-border",
};

export const accentFill: Record<VisualAccent, string> = {
  cyan: "bg-feature-cyan",
  blue: "bg-feature-blue",
  violet: "bg-feature-violet",
  green: "bg-feature-green",
  amber: "bg-feature-amber",
  orange: "bg-feature-orange",
  coral: "bg-feature-coral",
  muted: "bg-muted-foreground",
};

export const accentSelection: Record<VisualAccent, string> = {
  cyan: "bg-feature-cyan/6 ring-1 ring-inset ring-feature-cyan/25",
  blue: "bg-feature-blue/6 ring-1 ring-inset ring-feature-blue/25",
  violet: "bg-feature-violet/6 ring-1 ring-inset ring-feature-violet/25",
  green: "bg-feature-green/6 ring-1 ring-inset ring-feature-green/25",
  amber: "bg-feature-amber/6 ring-1 ring-inset ring-feature-amber/25",
  orange: "bg-feature-orange/6 ring-1 ring-inset ring-feature-orange/25",
  coral: "bg-feature-coral/6 ring-1 ring-inset ring-feature-coral/25",
  muted: "bg-secondary/60 ring-1 ring-inset ring-border",
};

export const levelAccent = {
  core: "cyan",
  infrastructure: "blue",
  security: "violet",
  advanced: "coral",
} as const satisfies Record<string, VisualAccent>;

const journeyAccents: VisualAccent[] = ["cyan", "blue", "violet", "amber", "orange", "coral"];

export function journeyAccent(index: number, total: number): VisualAccent {
  if (total <= 1) return journeyAccents[0] ?? "cyan";
  const position = Math.round((index / (total - 1)) * (journeyAccents.length - 1));
  return journeyAccents[position] ?? "coral";
}

export function featureAccent(path: string): VisualAccent {
  if (path.includes("daily-challenge")) return "orange";
  if (path.includes("practice") || path.includes("quiz")) return "blue";
  if (path.includes("lab") || path.includes("command-line")) return "violet";
  if (path.includes("resource") || path.includes("study-plan") || path.includes("bookmark")) return "green";
  if (path.includes("pomodoro") || path.includes("learn") || path.includes("video")) return "cyan";
  if (path.includes("review") || path.includes("flashcard")) return "violet";
  if (path.includes("troubleshoot") || path.includes("virus")) return "coral";
  if (path.includes("community")) return "blue";
  if (path.includes("news")) return "amber";
  if (path.includes("certification") || path.includes("achievement")) return "amber";
  if (path.includes("settings") || path.includes("about") || path.includes("guide")) return "muted";
  return "cyan";
}