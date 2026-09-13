import { staticContent, type StaticContent } from "@/data/static-content";
import type { UserData } from "./types";

export function getTopic(id: string, data: StaticContent = staticContent) {
  return data.topics.find((item) => item.id === id);
}

export function getLesson(id: string, data: StaticContent = staticContent) {
  return data.lessons.find((item) => item.id === id);
}

export function getResource(id: string, data: StaticContent = staticContent) {
  return data.resources.find((item) => item.id === id);
}

export function getAssignment(id: string, data: StaticContent = staticContent) {
  return data.assignments.find((item) => item.id === id);
}

export function getLab(id: string, data: StaticContent = staticContent) {
  return data.labs.find((item) => item.id === id);
}

export function getIncident(id: string, data: StaticContent = staticContent) {
  return data.incidents.find((item) => item.id === id);
}

export function getTicket(id: string, data: StaticContent = staticContent) {
  return data.tickets.find((item) => item.id === id);
}

export function getQuiz(id: string, data: StaticContent = staticContent) {
  return data.quizzes.find((item) => item.id === id);
}

export function getQuestion(id: string, data: StaticContent = staticContent) {
  return data.questions.find((item) => item.id === id);
}

export function getCertification(id: string, data: StaticContent = staticContent) {
  return data.certifications.find((item) => item.id === id);
}

export function getTopicProgress(user: UserData, topicId: string) {
  return user.topicProgress[topicId];
}
