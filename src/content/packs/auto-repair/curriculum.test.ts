import { describe, expect, it } from "vitest";
import { AUTO_PATH_CURRICULUM } from "@/content/packs/auto-repair/curriculum";

describe("AUTO PATH authored curriculum", () => {
  it("keeps workbook numbering sequential and titles unique", () => {
    expect(AUTO_PATH_CURRICULUM.length).toBeGreaterThan(100);
    expect(AUTO_PATH_CURRICULUM[0]?.title).toBe("The Modern Automobile");
    expect(AUTO_PATH_CURRICULUM[1]?.title).toBe("Automotive Terminology & Vehicle Layouts");
    expect(new Set(AUTO_PATH_CURRICULUM.map((lesson) => lesson.title)).size).toBe(AUTO_PATH_CURRICULUM.length);
  });

  it("keeps every lesson in a named curriculum group", () => {
    expect(AUTO_PATH_CURRICULUM.every((lesson) => lesson.group.trim() && lesson.title.trim())).toBe(true);
  });
});
