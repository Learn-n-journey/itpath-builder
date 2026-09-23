import { describe, expect, it } from "vitest";

import { staticContent } from "@/data/static-content";
import { checkTechnicalClaims } from "@/lib/technical-validation";

describe("deterministic technical checks", () => {
  it("catches mixed storage families", () => {
    expect(checkTechnicalClaims("1 GB = 1024 MB").length).toBe(1);
    expect(checkTechnicalClaims("1 GiB = 1024 MiB")).toEqual([]);
    expect(checkTechnicalClaims("1 GB = 1000 MB")).toEqual([]);
  });

  it("catches bit and byte mistakes", () => {
    expect(checkTechnicalClaims("1 byte is 10 bits").length).toBe(1);
    expect(checkTechnicalClaims("1 byte is 8 bits")).toEqual([]);
    expect(checkTechnicalClaims("100 Mbps is 100 MB/s").length).toBe(1);
  });

  it("catches subnet mistakes", () => {
    expect(checkTechnicalClaims("A /24 has a subnet mask of 255.255.0.0").length).toBe(1);
    expect(checkTechnicalClaims("A /24 has a subnet mask of 255.255.255.0")).toEqual([]);
    expect(checkTechnicalClaims("A /24 gives you 254 usable hosts")).toEqual([]);
    expect(checkTechnicalClaims("A /24 gives you 512 hosts").length).toBe(1);
    expect(checkTechnicalClaims("A /27 contains 32 addresses and usually 30 usable hosts")).toEqual([]);
    expect(checkTechnicalClaims("A /27 contains 32 addresses, while a /29 has 6 usable hosts")).toEqual([]);
    expect(checkTechnicalClaims("A /27 contains 32 addresses, while another block has 4 usable hosts")).toEqual([]);
    expect(checkTechnicalClaims("A /27 gives you 4 usable hosts").length).toBe(1);
  });

  it("catches wrong port numbers", () => {
    expect(checkTechnicalClaims("HTTPS runs on port 442").length).toBe(1);
    expect(checkTechnicalClaims("HTTPS runs on port 443")).toEqual([]);
    expect(checkTechnicalClaims("IMAP uses port 143")).toEqual([]);
  });

  it("catches broken arithmetic", () => {
    expect(checkTechnicalClaims("2^10 = 1000").length).toBe(1);
    expect(checkTechnicalClaims("2^10 = 1024")).toEqual([]);
    expect(checkTechnicalClaims("20% of 50 is 15").length).toBe(1);
  });

  it("leaves ordinary teaching prose alone", () => {
    expect(
      checkTechnicalClaims(
        "Open a terminal, run ipconfig, and note the default gateway. A switch forwards frames using MAC addresses.",
      ),
    ).toEqual([]);
  });
});

describe("curriculum number sweep", () => {
  it("every lesson states its numbers correctly", () => {
    const problems: string[] = [];
    for (const lesson of staticContent.lessons) {
      const text = [
        lesson.body,
        lesson.definition,
        lesson.whyItMatters,
        lesson.summary,
        ...lesson.realWorldExamples,
        ...lesson.commonMisconceptions,
        ...lesson.keyTerms.map((term) => `${term.term}: ${term.meaning}`),
      ].join("\n");
      for (const issue of checkTechnicalClaims(text)) {
        problems.push(`${lesson.topicId}: ${issue.claim.trim()} -> ${issue.problem}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("every stored question states its numbers correctly", () => {
    const problems: string[] = [];
    for (const question of staticContent.questions ?? []) {
      const text = `${question.prompt} ${question.correctAnswer?.join(" ") ?? ""} ${question.explanation ?? ""}`;
      for (const issue of checkTechnicalClaims(text)) {
        problems.push(`${question.id}: ${issue.claim.trim()} -> ${issue.problem}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
