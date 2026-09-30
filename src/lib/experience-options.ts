import type { ExperienceLevel } from "@/lib/app-data/types";

const IT_EXPERIENCE: { id: ExperienceLevel; label: string }[] = [
  { id: "none", label: "Complete beginner" },
  { id: "beginner", label: "Some basics" },
  { id: "some", label: "Home lab experience" },
  { id: "intermediate", label: "Working in IT already" },
];

export function experienceOptions(_domainId: string): { id: ExperienceLevel; label: string }[] {
  return IT_EXPERIENCE;
}
