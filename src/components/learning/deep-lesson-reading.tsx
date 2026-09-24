import { useMemo, useState } from "react";

import { LessonPartReader } from "@/components/learning/lesson-part-reader";
import { LessonRoadmap } from "@/components/learning/lesson-roadmap";
import type { DeepLesson } from "@/data/deep-lessons";
import type { Difficulty } from "@/lib/app-data/types";
import { contentFingerprint, deepSectionId } from "@/lib/lesson-concepts";
import { useAppState } from "@/state/app-state";

/**
 * Learn It has two presentation modes: the lesson roadmap and a focused
 * single-part reader. Reading-position persistence remains navigation state,
 * not mastery evidence.
 */
export function DeepLessonReading({
  lesson,
  difficulty = "standard",
}: {
  lesson: DeepLesson;
  difficulty?: Difficulty;
}) {
  const { user, actions } = useAppState();
  const saved = user.readingPositions[lesson.topicId];
  const fingerprint = useMemo(() => contentFingerprint(lesson), [lesson]);
  const sectionIds = useMemo(
    () => lesson.sections.map((section) => deepSectionId(lesson.topicId, section)),
    [lesson],
  );
  const savedIndex = saved ? sectionIds.indexOf(saved.sectionId) : -1;
  const [activeLessonPartIndex, setActiveLessonPartIndex] = useState<number | null>(null);

  function saveSection(sectionIndex: number, markReviewed: boolean) {
    const sectionId = sectionIds[sectionIndex];
    if (!sectionId) return;
    const reviewed = new Set(
      (user.readingPositions[lesson.topicId]?.reviewedSectionIds ?? []).filter((id) =>
        sectionIds.includes(id),
      ),
    );
    if (markReviewed) reviewed.add(sectionId);
    actions.setReadingPosition({
      topicId: lesson.topicId,
      sectionId,
      offset: 0,
      contentFingerprint: fingerprint,
      updatedAt: new Date().toISOString(),
      reviewedSectionIds: [...reviewed],
    });
  }

  function openSection(sectionIndex: number) {
    if (sectionIndex < 0 || sectionIndex >= lesson.sections.length) return;
    saveSection(sectionIndex, false);
    setActiveLessonPartIndex(sectionIndex);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  if (activeLessonPartIndex !== null) {
    return (
      <LessonPartReader
        lesson={lesson}
        sectionIndex={activeLessonPartIndex}
        difficulty={difficulty}
        onBackToRoadmap={() => setActiveLessonPartIndex(null)}
        onNavigateSection={openSection}
        onCompleteSection={(sectionIndex) => saveSection(sectionIndex, true)}
      />
    );
  }

  return (
    <LessonRoadmap
      lesson={lesson}
      {...(saved ? { readingPosition: saved } : {})}
      onSelectSection={openSection}
    />
  );
}
