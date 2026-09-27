import type { ExperienceLevel } from "@/lib/app-data/types";

const IT_EXPERIENCE: { id: ExperienceLevel; label: string }[] = [
  { id: "none", label: "Complete beginner" },
  { id: "beginner", label: "Some basics" },
  { id: "some", label: "Home lab experience" },
  { id: "intermediate", label: "Working in IT already" },
];

const AUTO_EXPERIENCE: { id: ExperienceLevel; label: string }[] = [
  { id: "none", label: "New to automotive" },
  { id: "beginner", label: "Some automotive basics" },
  { id: "some", label: "DIY / hands-on experience" },
  { id: "intermediate", label: "Working in automotive already" },
];

export function experienceOptions(domainId: string): { id: ExperienceLevel; label: string }[] {
  return domainId === "auto-repair" ? AUTO_EXPERIENCE : IT_EXPERIENCE;
}
