import { certifications, topics } from "@/data/static-content";
import { certificationTopics, type StageId } from "@/lib/cert-path";
import type { Certification, Difficulty, ExperienceLevel, Topic, UserData, UserSettings } from "@/lib/app-data/types";

export const stageForDifficulty: Record<Difficulty, StageId> = {
  gentle: "foundation",
  standard: "core",
  challenging: "advanced",
};

export const experienceLabels: Record<ExperienceLevel, string> = {
  none: "Complete beginner",
  beginner: "Some basics",
  some: "Home lab experience",
  intermediate: "Working in IT already",
};

export function selectedCertification(settings: UserSettings): Certification {
  return (
    certifications.find(
      (certification) =>
        certification.id === settings.certificationTarget ||
        certification.title === settings.certificationTarget,
    ) ?? certifications[0]
  );
}

export function experienceStartStage(experience: ExperienceLevel): StageId {
  if (experience === "none") return "foundation";
  if (experience === "intermediate") return "advanced";
  return "core";
}

function topicScore(user: UserData, topic: Topic): number {
  const progress = user.topicProgress[topic.id];
  if (!progress) return 0;
  return (
    progress.understanding +
    progress.recall +
    progress.application +
    progress.practicalAbility +
    progress.troubleshooting +
    progress.retention
  ) / 6;
}

function unfinished(user: UserData, topic: Topic): boolean {
  const status = user.topicProgress[topic.id]?.status;
  return status !== "completed" && status !== "mastered";
}

export interface AdaptivePath {
  certification: Certification;
  topics: Topic[];
  recommendedTopic?: Topic;
  startStage: StageId;
  startLabel: string;
  reason: string;
}

export function adaptivePath(user: UserData): AdaptivePath {
  const certification = selectedCertification(user.settings);
  const courseTopics = certificationTopics(certification.id);
  const startStage = experienceStartStage(user.settings.experienceLevel);
  const startIndex = startStage === "foundation" ? 0 : startStage === "core" ? 1 : 2;
  const ranked = courseTopics.map((topic) => ({
    topic,
    rank: stageForDifficulty[topic.difficulty] === "foundation" ? 0 : stageForDifficulty[topic.difficulty] === "core" ? 1 : 2,
  }));
  const atLevel = ranked.filter((entry) => entry.rank >= startIndex).map((entry) => entry.topic);
  const fallback = [...ranked].reverse().find((entry) => entry.rank < startIndex)?.topic;
  const candidates = atLevel.length > 0 ? atLevel : fallback ? [fallback] : courseTopics;
  const recommendedTopic =
    candidates.find((topic) => unfinished(user, topic) && topic.prerequisiteTopicIds.every((id) => {
      const prerequisite = topics.find((item) => item.id === id);
      return !prerequisite || prerequisite.certificationId !== certification.id || topicScore(user, prerequisite) >= 60;
    })) ?? candidates.find((topic) => unfinished(user, topic)) ?? candidates[0];

  const startLabel =
    startStage === "foundation" ? "Start with the essentials" : startStage === "core" ? "Start with core skills" : "Start with advanced material";
  const reason = `${experienceLabels[user.settings.experienceLevel]} profile for ${certification.title}`;

  return { certification, topics: courseTopics, recommendedTopic, startStage, startLabel, reason };
}

export function focusedTopicsFirst(user: UserData, list: Topic[] = topics): Topic[] {
  const focus = adaptivePath(user);
  const focusIds = new Set(focus.topics.map((topic) => topic.id));
  return [...list].sort((a, b) => {
    const aFocus = focusIds.has(a.id) ? 0 : 1;
    const bFocus = focusIds.has(b.id) ? 0 : 1;
    if (aFocus !== bFocus) return aFocus - bFocus;
    if (a.id === focus.recommendedTopic?.id) return -1;
    if (b.id === focus.recommendedTopic?.id) return 1;
    return 0;
  });
}