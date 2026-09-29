import { describe, expect, it } from "vitest";
import { createDefaultUserData } from "@/lib/app-data/defaults";
import { nextActions } from "./next-action";
import { buildStudyCandidates } from "./study-engine";
import { journeyTopics } from "./journey-order";

const NOW=new Date("2026-09-29T12:00:00.000Z");

function userWithRecall() {
  const user=createDefaultUserData();
  const topic=journeyTopics(user)[0]!;
  user.recallResponses.push({
    id:"recall-started",
    questionId:"question-test",
    topicId:topic.id,
    answer:"answer",
    correct:true,
    matchedConcepts:["test"],
    createdAt:"2026-09-28T12:00:00.000Z",
  });
  return {user,topic};
}

describe("learner journey recommendation consistency", () => {
  it("treats non-assignment learning evidence as started work", () => {
    const {user,topic}=userWithRecall();
    const actions=nextActions(user,NOW);
    expect(actions.some(action=>action.topicId===topic.id && action.id.startsWith("next-intel-"))).toBe(true);
  });

  it("keeps due retention review at the front of Next Action", () => {
    const {user,topic}=userWithRecall();
    user.reviews.push({
      id:"review-due",
      topicId:topic.id,
      dueAt:"2026-09-28T12:00:00.000Z",
      interval:7,
      intervalIndex:2,
      status:"scheduled",
      successStreak:1,
      lapses:0,
      totalReviews:1,
      createdAt:"2026-09-20T12:00:00.000Z",
      updatedAt:"2026-09-20T12:00:00.000Z",
    });
    expect(nextActions(user,NOW)[0]?.id).toBe("next-review");
  });

  it("offers at most one primary Study Plan task for a topic", () => {
    const {user}=userWithRecall();
    const candidates=buildStudyCandidates(user,NOW);
    const topicIds=candidates.flatMap(candidate=>candidate.topicId?[candidate.topicId]:[]);
    expect(new Set(topicIds).size).toBe(topicIds.length);
  });

  it("does not invent completed work for a brand-new learner", () => {
    const user=createDefaultUserData();
    const candidates=buildStudyCandidates(user,NOW);
    expect(candidates.some(candidate=>candidate.kind==="review"||candidate.kind==="weak_topic")).toBe(false);
    expect(nextActions(user,NOW).some(action=>action.id==="next-review"||action.id==="next-weak-areas")).toBe(false);
  });
});
