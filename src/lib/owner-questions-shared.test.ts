import { describe, expect, it } from "vitest";

import {
  itTopicNumbers,
  topicForNumber,
  topicNumber,
} from "@/lib/owner-questions-shared";

describe("IT PATH spreadsheet numbering", () => {
  it("keeps lesson 3 as Basic Networking Concepts", () => {
    expect(topicForNumber("it-cybersecurity", 3)?.topicId).toBe(
      "topic-basic-networking-concepts",
    );
  });

  it("reserves workbook number 7 for the retired Networking Basics lesson", () => {
    expect(topicForNumber("it-cybersecurity", 7)).toBeUndefined();
    expect(itTopicNumbers.some((topic) => topic.topicId === "topic-networking-basics")).toBe(false);
  });

  it("does not shift any workbook after the retired number", () => {
    expect(topicForNumber("it-cybersecurity", 8)?.topicId).toBe("topic-dns-fundamentals");
    expect(topicNumber("it-cybersecurity", "topic-dns-fundamentals")).toBe(8);
  });
});