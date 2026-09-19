/**
 * The IT subject expressed as a domain package.
 *
 * The shipped IT material is authored across `src/data`, not generated, so
 * this file reads it and presents it in the same package shape a generated
 * subject arrives in. That keeps one QA path for every subject: the auditor
 * never has to know whether a package was written by a person or by the
 * pipeline.
 *
 * Heavy: loaded by QA, the pipeline and tests, never by a page.
 */
import { certificationObjectives, certifications } from "@/data/certification-content";
import { staticContent } from "@/data/static-content";
import { messerTopicVideos } from "@/data/messer-topic-videos";
import { readingForTopic } from "@/data/topic-reading";
import { getTopicQuestionPool, SECTION_QUIZ_SIZE } from "@/data/topic-quizzes";
import { stageExams, STAGE_EXAM_SIZE } from "@/data/stage-exams";
import { itDomain } from "@/domain/it";
import { itManifest } from "@/domain/packages/it";
import { domainId, measure } from "@/domain/package";
import type {
  DomainAssessment,
  DomainConcept,
  DomainLesson,
  DomainPackage,
  DomainPrerequisite,
  DomainQuestion,
  DomainSection,
  DomainSkill,
  DomainSource,
} from "@/domain/package";

const D = itDomain.id;

export function buildItPackage(): DomainPackage {
  const qualifications = certifications.map((cert) => ({
    id: cert.id,
    title: cert.title,
    summary: cert.description ?? "",
    objectives: certificationObjectives
      .filter((objective) => objective.certificationId === cert.id)
      .map((objective) => ({
        id: objective.id,
        domain: objective.domain ?? objective.code,
        text: objective.title,
      })),
  }));

  const sections: DomainSection[] = staticContent.topics.map((topic, index) => ({
    id: domainId(D, "section", topic.id),
    slug: topic.id,
    title: topic.title,
    summary: topic.summary,
    qualificationId: topic.certificationId,
    order: index,
    objectiveIds: certificationObjectives
      .filter((objective) => objective.topicIds?.includes(topic.id))
      .map((objective) => objective.id),
  }));

  const lessons: DomainLesson[] = staticContent.lessons.map((lesson) => ({
    sectionId: domainId(D, "section", lesson.topicId),
    title: lesson.title,
    body: lesson.body,
    definition: lesson.definition,
    whyItMatters: lesson.whyItMatters,
    summary: lesson.summary,
  }));

  const concepts: DomainConcept[] = staticContent.lessons.flatMap((lesson) =>
    lesson.keyTerms.map((term) => ({
      id: domainId(D, "concept", lesson.topicId, term.term),
      sectionId: domainId(D, "section", lesson.topicId),
      term: term.term,
      meaning: term.meaning,
    })),
  );

  const skills: DomainSkill[] = staticContent.topics.flatMap((topic) =>
    topic.learningObjectives.map((statement) => ({
      id: domainId(D, "skill", topic.id, statement.slice(0, 40)),
      sectionId: domainId(D, "section", topic.id),
      statement,
    })),
  );

  const prerequisites: DomainPrerequisite[] = staticContent.topics.flatMap((topic) =>
    topic.prerequisiteTopicIds.map((requires) => ({
      sectionId: domainId(D, "section", topic.id),
      requiresSectionId: domainId(D, "section", requires),
    })),
  );

  const questions: DomainQuestion[] = staticContent.topics.flatMap((topic) =>
    getTopicQuestionPool(topic.id).map((question) => {
      const choices = question.choices ?? [];
      return {
        id: domainId(D, "question", question.id),
        sectionId: domainId(D, "section", topic.id),
        kind: "practice" as const,
        prompt: question.prompt,
        choices,
        answerIndex: Math.max(0, choices.indexOf(question.correctAnswer?.[0] ?? "")),
        explanation: question.explanation ?? "",
      };
    }),
  );

  const assessments: DomainAssessment[] = stageExams.map((exam) => ({
    id: domainId(D, "assessment", exam.id),
    // A stage paper closes a band of the journey, which can span certifications.
    coversQualificationIds: certifications
      .filter((cert) => (cert.months ?? []).some((month) => month >= exam.from && month <= exam.to))
      .map((cert) => cert.id),
    title: exam.title,
    questionCount: STAGE_EXAM_SIZE,
    passPercent: 80,
    objectiveIds: [],
  }));

  const sources: DomainSource[] = [
    ...Object.entries(messerTopicVideos).flatMap(([topicId, videos]) =>
      videos.map((video) => ({
        sectionId: domainId(D, "section", topicId),
        label: video.title,
        url: video.url,
        kind: "video" as const,
      })),
    ),
    ...staticContent.topics.flatMap((topic) =>
      readingForTopic(topic).map((item) => ({
        sectionId: domainId(D, "section", topic.id),
        label: item.title,
        url: item.url,
        kind: "reading" as const,
      })),
    ),
  ];

  const pkg: DomainPackage = {
    manifest: itManifest,
    definition: itDomain,
    qualifications,
    sections,
    lessons,
    concepts,
    skills,
    prerequisites,
    questions,
    assessments,
    sources,
    rules: [],
    assessmentSizes: { sectionQuiz: SECTION_QUIZ_SIZE, stageExam: STAGE_EXAM_SIZE },
  };

  return { ...pkg, manifest: { ...pkg.manifest, scope: measure(pkg) } };
}
