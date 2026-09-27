import { describe, expect, it } from "vitest";
import { autoPathCurriculumPackage } from "@/content/packs/auto-repair/auto-path-pack";
import { AUTO_PATH_CURRICULUM } from "@/content/packs/auto-repair/curriculum";

describe("AUTO PATH stage structure", () => {
  it("uses the authored curriculum for the active 3.7 package", () => {
    const pkg = autoPathCurriculumPackage();
    expect(pkg.sections).toHaveLength(AUTO_PATH_CURRICULUM.length);
    expect(pkg.sections[0]?.title).toBe("The Modern Automobile");
    expect(pkg.qualifications[0]?.title).toBe("Automotive Foundations");
  });

  it("makes Automotive Foundations Stage 1 with workbooks 1 through 5", () => {
    const pkg = autoPathCurriculumPackage();
    const stage = pkg.qualifications[0]!;
    const stageSections = pkg.sections.filter((section) => section.qualificationId === stage.id);
    expect(stageSections.map((section) => section.order)).toEqual([1, 2, 3, 4, 5]);
    expect(stageSections.map((section) => section.title)).toEqual([
      "The Modern Automobile",
      "Automotive Terminology & Vehicle Layouts",
      "Shop Safety & PPE",
      "Lifting, Supporting & Working Around Vehicles",
      "Automotive Physics Fundamentals",
    ]);
    expect(pkg.assessments[0]?.coversQualificationIds).toEqual([stage.id]);
  });
});
