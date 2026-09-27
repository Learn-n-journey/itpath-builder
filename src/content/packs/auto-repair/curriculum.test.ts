import { describe, expect, it } from "vitest";
import { AUTO_PATH_CURRICULUM, autoCurriculumTopicId } from "@/content/packs/auto-repair/curriculum";
import { autoTopicNumbers, topicForNumber } from "@/lib/owner-questions-shared";

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

  it("maps numbered Auto workbooks to the exact curriculum topic ids", () => {
    expect(autoTopicNumbers).toHaveLength(AUTO_PATH_CURRICULUM.length);
    expect(topicForNumber("auto-repair", 1)).toMatchObject({ title: "The Modern Automobile", topicId: autoCurriculumTopicId(1) });
    expect(topicForNumber("auto-repair", 2)).toMatchObject({ title: "Automotive Terminology & Vehicle Layouts", topicId: autoCurriculumTopicId(2) });
    expect(autoTopicNumbers.every((topic, index) => topic.number === index + 1 && topic.topicId === autoCurriculumTopicId(index + 1))).toBe(true);
  });
});
