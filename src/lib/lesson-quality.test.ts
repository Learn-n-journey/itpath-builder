import { describe, expect, it } from "vitest";

import type { Lesson, Topic } from "@/lib/app-data/types";
import { lessonQualityIssues } from "@/lib/lesson-quality";

const topic: Topic = {
  id: "topic-brakes",
  trackId: "repair",
  title: "Brake diagnosis",
  summary: "Diagnose braking faults from measurements.",
  certificationId: "repair",
  year: 1,
  month: 1,
  week: 1,
  difficulty: "standard",
  prerequisiteTopicIds: [],
  learningObjectives: ["Measure brake pad thickness", "Diagnose uneven brake wear"],
  estimatedMinutes: 30,
};

const lesson: Lesson = {
  id: "lesson-brakes",
  topicId: topic.id,
  title: topic.title,
  body: "Brake diagnosis begins with the reported symptom, a visual inspection, and measurements compared with service information.",
  definition: "Brake diagnosis is the evidence-led process of locating the cause of a braking symptom.",
  whyItMatters: "Accurate diagnosis avoids unsafe repairs and unnecessary replacement of working parts.",
  keyTerms: [
    { term: "runout", meaning: "side-to-side rotor movement during rotation" },
    { term: "taper wear", meaning: "uneven pad thickness from one edge to another" },
    { term: "service limit", meaning: "the smallest safe measurement specified by the maker" },
  ],
  realWorldExamples: ["A pull during braking can be compared with left-to-right pad and hydraulic evidence."],
  commonMisconceptions: ["Brake noise alone does not prove that the pads are below their service limit."],
  summary: "Confirm the symptom, inspect, measure, compare, repair, and verify.",
  nextSteps: ["Measure both sides and record the evidence before choosing a repair."],
};

describe("lesson quality", () => {
  it("accepts concrete teaching material", () => {
    expect(lessonQualityIssues(topic, lesson)).toEqual([]);
  });

  it("rejects filler, vague objectives, and empty definitions", () => {
    const weakTopic = { ...topic, learningObjectives: ["Brake information"] };
    const weakLesson = {
      ...lesson,
      body: "In this lesson we will discuss brakes.",
      definition: "Brakes.",
      keyTerms: [{ term: "brake", meaning: "brake" }],
    };
    const issues = lessonQualityIssues(weakTopic, weakLesson);
    expect(issues).toContain("a learning objective is not a specific observable action");
    expect(issues).toContain("a core lesson section is too short to teach anything");
    expect(issues).toContain("a key term has no meaningful plain-language definition");
  });
});