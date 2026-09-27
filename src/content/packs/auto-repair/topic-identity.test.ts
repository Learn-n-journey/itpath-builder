import { describe, expect, it } from "vitest";
import { autoPathCurriculumPackage } from "@/content/packs/auto-repair/auto-path-pack";
import { autoCurriculumTopicId } from "@/content/packs/auto-repair/curriculum";
import { coursePackFromDomainPackage } from "@/content/packs/from-package";

describe("AUTO PATH topic identity contract", () => {
  it("keeps each numbered workbook on the corresponding unique course topic", () => {
    const pack = coursePackFromDomainPackage(autoPathCurriculumPackage());
    expect(pack.sections[0]?.id).toBe(autoCurriculumTopicId(1));
    expect(pack.sections[1]?.id).toBe(autoCurriculumTopicId(2));
    expect(pack.sections[2]?.id).toBe(autoCurriculumTopicId(3));
    expect(new Set(pack.sections.map((topic) => topic.id)).size).toBe(pack.sections.length);
  });

  it("uses the same IDs for deep owner lessons", () => {
    const pack = coursePackFromDomainPackage(autoPathCurriculumPackage());
    expect(pack.sections.slice(0, 5).map((topic) => topic.id)).toEqual(
      [1, 2, 3, 4, 5].map(autoCurriculumTopicId),
    );
  });
});
