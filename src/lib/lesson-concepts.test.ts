import { describe, expect, it } from "vitest";
import { contentFingerprint, deepSectionId, generatedQuestionSection, lessonConceptAnchor, lessonSectionId, resolveLessonSection } from "./lesson-concepts";

const lesson = { topicId: "topic-a", readingMinutes: 5, intro: "Intro", whereYouMeetIt: "Work", sections: [
  { id: "topic-a:lesson:stable", heading: "Old heading", paragraphs: ["One"] },
  { heading: "Second part", paragraphs: ["Two"] },
] };

describe("lesson concept mapping", () => {
  it("keeps authored ids stable and resolves their rendered anchor", () => {
    const id = deepSectionId("topic-a", lesson.sections[0]!);
    expect(id).toBe("topic-a:lesson:stable");
    expect(resolveLessonSection("topic-a", id, lesson)?.anchor).toBe(lessonConceptAnchor(id));
  });
  it("maps generated assessment sources without matching displayed text", () => {
    expect(generatedQuestionSection("topic-a", "how-it-works")).toBe(lessonSectionId("topic-a", "how-it-works"));
    expect(generatedQuestionSection("topic-a", "owner")).toBeUndefined();
  });
  it("changes the fingerprint when lesson structure changes", () => {
    expect(contentFingerprint(lesson)).not.toBe(contentFingerprint({ ...lesson, sections: lesson.sections.slice(0, 1) }));
  });
});