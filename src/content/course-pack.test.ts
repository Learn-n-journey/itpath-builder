/**
 * Acceptance test for a course pack.
 *
 * Any subject dropped into this app has to pass this file. It asks the
 * questions the engine assumes are already true: every section teaches
 * something, can be assessed, unlocks in a sane order and points at real
 * outside material.
 */
import { describe, expect, it } from "vitest";

import { coursePack } from "@/content/course-pack";

const pack = coursePack;

describe("course pack", () => {
  it("describes its subject", () => {
    expect(pack.subject.field.length).toBeGreaterThan(2);
    expect(pack.domain.id.length).toBeGreaterThan(2);
    expect(pack.domain.appName.length).toBeGreaterThan(1);
    // The pack and the wording have to be talking about the same subject.
    expect(pack.domain.field).toBe(pack.subject.field);
    expect(pack.domain.vocabulary.qualification).toBe(pack.subject.qualificationWord);
    // A new learner has to start on a qualification this pack actually holds.
    expect(pack.qualifications.map((item) => item.title)).toContain(pack.domain.defaultQualification);
    expect(pack.subject.qualificationWord.length).toBeGreaterThan(2);
    expect(pack.qualifications.length).toBeGreaterThan(0);
    expect(pack.sections.length).toBeGreaterThan(0);
  });

  it("gives every section a lesson with real teaching text", () => {
    for (const section of pack.sections) {
      const lesson = pack.lessons.find((item) => item.topicId === section.id);
      expect(lesson, `${section.title} has no lesson`).toBeTruthy();
      // The short intro sits on the lesson; the teaching itself is in the
      // deep lesson or the module, so a section needs at least one of those.
      expect(lesson!.body.length, `${section.title} lesson is too thin`).toBeGreaterThan(80);
      const taught =
        (pack.getDeepLesson(section.id)?.sections.length ?? 0) > 0 ||
        pack.modules.some((module) => module.topicId === section.id);
      expect(taught, `${section.title} has nothing to teach from`).toBe(true);
      expect(section.summary.length).toBeGreaterThan(20);
    }
  });

  it("gives every section a quiz that can actually be sat", () => {
    for (const section of pack.sections) {
      const questions = pack.sectionQuiz(section.id, 0);
      expect(questions.length, `${section.title} has no quiz`).toBeGreaterThan(4);
      for (const question of questions) {
        expect(question.correctAnswer.length, `${question.id} has no answer`).toBeGreaterThan(0);
        if (question.choices.length) {
          for (const answer of question.correctAnswer) {
            expect(question.choices, `${question.id} answer is not among the choices`).toContain(answer);
          }
        }
      }
    }
  }, 120000);


  it("gives every section recall practice", () => {
    const thin = pack.sections.filter((section) => pack.getRecallQuestions(section.id).length === 0);
    expect(thin.map((section) => section.title)).toEqual([]);
  });

  it("belongs to a qualification that exists", () => {
    const ids = new Set(pack.qualifications.map((qualification) => qualification.id));
    for (const section of pack.sections) {
      expect(ids.has(section.certificationId), `${section.title} points at a missing qualification`).toBe(true);
    }
  });

  it("only requires prerequisites that exist", () => {
    const skillIds = new Set(pack.prerequisites.map((node) => node.id));
    for (const node of pack.prerequisites) {
      for (const required of node.prerequisiteSkillIds) {
        expect(skillIds.has(required), `${node.id} requires missing ${required}`).toBe(true);
      }
    }
  });

  it("orders sections into phases without repeating one", () => {
    const seen = new Set<string>();
    for (const phase of pack.phases) {
      for (const topic of phase.topics) {
        expect(seen.has(topic.id), `${topic.id} appears in two phases`).toBe(false);
        seen.add(topic.id);
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it("has stage exams that can be sat", () => {
    for (const exam of pack.stageExams) {
      expect(pack.stageExamQuestions(exam.id).length, `${exam.id} has no questions`).toBeGreaterThan(9);
    }
  });

  it("points every section at its own outside video and reading", () => {
    const missing = pack.sections.filter((section) => (pack.resources.videos[section.id] ?? []).length === 0);
    expect(missing.map((section) => section.title)).toEqual([]);
    expect(Object.keys(pack.resources.reading).length).toBeGreaterThan(0);
  });
});
