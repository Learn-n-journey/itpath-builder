import { describe, expect, it } from "vitest";
import {
  classifyCoverage,
  courseCoverage,
  coverageCsv,
  requiredKnowledge,
  type ClassifyOptions,
  type TaughtVocabulary,
} from "./concept-coverage";
import { coursePack } from "@/content/course-pack";

/** A stand-in body of teaching material. */
function vocabularyOf(...texts: string[]): TaughtVocabulary {
  // Uses the same builder the real check does, via a tiny fake pack surface.
  const module = require("./concept-coverage") as typeof import("./concept-coverage");
  const fake = {
    sections: [{ id: "t", title: "Topic", summary: "", learningObjectives: [], prerequisiteTopicIds: [] }],
    lessonText: () => texts.join("\n"),
    getDeepLesson: () => undefined,
    getPracticeActivities: () => [],
    getRecallQuestions: () => [],
    getRealWorldScenario: () => undefined,
    resources: { videos: {}, reading: {} },
  } as unknown as Parameters<typeof module.taughtVocabulary>[0];
  return module.taughtVocabulary(fake, "t");
}

const emptyCourse = vocabularyOf("");

function options(topic: TaughtVocabulary, course = topic): ClassifyOptions {
  return { topic, course };
}

describe("requiredKnowledge", () => {
  it("ignores ordinary question and scenario language", () => {
    const terms = requiredKnowledge("Which statement best represents the most likely relationship?");
    expect(terms).toEqual([]);
  });

  it("keeps technical terms, acronyms and commands", () => {
    const terms = requiredKnowledge("Which DNS record does ipconfig /flushdns clear?");
    expect(terms).toContain("dns");
    expect(terms).toContain("ipconfig");
    expect(terms).toContain("/flushdns");
  });
});

describe("classifyCoverage", () => {
  it("passes a question that paraphrases taught material", () => {
    const taught = vocabularyOf("Subnetting splits one network into smaller networks so broadcast traffic stays local.");
    const result = classifyCoverage("Why would an administrator apply subnetting to a busy network?", ["broadcast traffic"], options(taught));
    expect(result.verdict).toBe("pass");
    expect(result.missing).toEqual([]);
  });

  it("does not fail a question only because a word is missing", () => {
    const taught = vocabularyOf("A firewall filters traffic between networks using rules.");
    const result = classifyCoverage("Which statement most strongly indicates a firewall rule is blocking traffic?", ["a filtered packet"], options(taught));
    expect(result.verdict).toBe("pass");
  });

  it("accepts an abbreviation the lesson established", () => {
    const taught = vocabularyOf("The Domain Name System (DNS) turns names into addresses.");
    const result = classifyCoverage("What does DNS resolve?", ["names to addresses"], options(taught));
    expect(result.verdict).toBe("pass");
  });

  it("accepts a taught synonym", () => {
    const taught = vocabularyOf("Create a directory before copying the files into it.");
    const result = classifyCoverage("Which folder should hold the copied files?", [], options(taught));
    expect(result.verdict).toBe("pass");
  });

  it("fails a question that needs knowledge nothing teaches", () => {
    const taught = vocabularyOf("A firewall filters traffic between networks using rules.");
    const result = classifyCoverage(
      "Which Kerberos ticket does golden-ticket forgery abuse during lateral movement?",
      ["krbtgt hash"],
      options(taught, emptyCourse),
    );
    expect(result.verdict).toBe("fail");
    expect(result.missingEverywhere.length).toBeGreaterThan(0);
    expect(result.remediation).toMatch(/out-of-scope|replace/i);
  });

  it("marks material taught elsewhere in the course as review, not fail", () => {
    const topic = vocabularyOf("A firewall filters traffic between networks using rules.");
    const course = vocabularyOf(
      "A firewall filters traffic between networks using rules.",
      "Kerberos issues tickets so services can trust a signed identity.",
    );
    const result = classifyCoverage("Which Kerberos ticket proves identity to a service?", [], { topic, course });
    expect(result.verdict).toBe("review");
  });

  it("passes a question needing no technical knowledge", () => {
    const result = classifyCoverage("Which answer is generally considered best?", [], options(emptyCourse));
    expect(result.verdict).toBe("pass");
    expect(result.reason).toMatch(/ordinary reasoning/);
  });

  it("tells the owner to teach the concept when the topic's objectives promise it", () => {
    const topic = vocabularyOf("This lesson introduces addressing.");
    const result = classifyCoverage("How does subnetting reduce broadcast traffic?", [], {
      topic,
      course: emptyCourse,
      objectiveTerms: new Set(["subnet", "broadcast"]),
    });
    expect(result.verdict).not.toBe("pass");
    expect(result.remediation).toMatch(/Teach it properly/);
  });
});

describe("the live course", () => {
  it("judges every question and never reports a bare word mismatch as failure", { timeout: 120_000 }, () => {
    const report = courseCoverage(coursePack);
    expect(report.pass + report.review + report.fail).toBeGreaterThan(0);
    for (const finding of report.findings) {
      expect(finding.missingKnowledge.length).toBeGreaterThan(0);
      if (finding.verdict === "fail") expect(finding.missingEverywhere.length).toBeGreaterThan(0);
    }
  });

  it("writes a CSV with a row per finding", () => {
    const csv = coverageCsv([
      {
        topicId: "t",
        topicTitle: "Topic",
        kind: "quiz",
        questionId: "q1",
        prompt: 'A "quoted" prompt',
        verdict: "fail",
        requiredKnowledge: ["kerberos"],
        taughtKnowledge: [],
        missingKnowledge: ["kerberos"],
        lessonEvidence: [],
        reason: "never taught",
        remediation: "replace",
      },
    ]);
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv).toContain('""quoted""');
  });
});
