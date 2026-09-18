/**
 * Study rooms.
 *
 * There is one general room plus one room per curriculum section, so a hard
 * troubleshooting scenario can be worked through with the people studying the
 * same material. Room ids are validated against the static curriculum, so a
 * made up room can never be opened or posted to.
 */
import { topics } from "@/data/static-content";

export const GENERAL_ROOM = "general";

export function roomForTopic(topicId: string): string {
  return topicId.startsWith("topic-") ? topicId : `topic-${topicId}`;
}

export function topicForRoom(room: string): string | null {
  if (room === GENERAL_ROOM) return null;
  const topic = topics.find((item) => item.id === room);
  return topic ? topic.id : null;
}

export function isValidRoom(room: string): boolean {
  return room === GENERAL_ROOM || topicForRoom(room) !== null;
}

export function roomTitle(room: string): string {
  const topicId = topicForRoom(room);
  if (!topicId) return "General room";
  return topics.find((topic) => topic.id === topicId)?.title ?? "Section room";
}
