/**
 * The QA pass has to reject a bad subject and accept a sound one. If it
 * cannot tell them apart, the whole pipeline is theatre.
 */
import { describe, expect, it } from "vitest";

import { auditDomainDraft, failingSections } from "./validate";
import type { DomainDraft } from "./brief";
import type { TopicSeed } from "@/data/curriculum/builder";

function soundSeed(slug: string, cert: string, prereqs: string[] = []): TopicSeed {
  const filler =
    "Brake pads press against the rotor to slow the wheel. The pad material wears down with use, and the thickness left on the pad is what tells you whether it is safe to leave in service. A technician measures the remaining friction material, compares it against the figure in the service manual, and replaces the pads in axle sets so braking stays even side to side. ";
  return {
    slug,
    title: `Section ${slug}`,
    summary: "How the part works, how it wears and how it is measured in service.",
    cert,
    month: 1,
    week: 1,
    difficulty: "standard",
    prereqs,
    minutes: 45,
    objectives: ["Measure remaining friction material", "Decide when a pad set is replaced"],
    lesson: {
      title: `Section ${slug}`,
      body: filler.repeat(2),
      definition: "Friction material is the wearing surface bonded to the pad backing plate.",
      whyItMatters: "A worn pad set lengthens stopping distance and damages the rotor.",
      keyTerms: [
        ["pad", "the friction part that presses on the rotor"],
        ["rotor", "the disc the pad clamps"],
        ["caliper", "the housing that squeezes the pads"],
      ],
      examples: ["A pad measured below the service limit is replaced as an axle set."],
      misconceptions: ["People assume noise always means worn pads."],
      summary: "Measure, compare against the manual, replace in sets.",
      nextSteps: ["Practise measuring a used pad set."],
    },
    module: {
      howItWorks: ["The caliper squeezes the pads against the rotor."],
      whereYouSeeIt: ["Every routine brake service."],
      commonProblems: ["Uneven wear across an axle."],
      howItFails: ["Friction material worn to the backing plate."],
      troubleshooting: ["Measure both sides before condemning a caliper."],
      practicalKnowledge: ["Always work to the manual figure, not by eye."],
      examCoverage: ["Brake service limits."],
      interviewQuestions: ["How do you decide a pad set is finished?"],
    },
    recall: [
      ["What tells you a pad set has reached its limit?", ["the measured thickness against the manual"], "The manual figure decides it."],
      ["Why are pads replaced in axle sets?", ["so braking stays even side to side"], "Uneven pads pull the vehicle."],
    ],
    practice: {
      title: "Check yourself",
      prompt: "What decides whether a brake pad set stays in service?",
      choices: [
        "The measured friction material against the manual figure",
        "The mileage since the last service",
        "Whether the brakes make any noise",
        "The age of the vehicle",
      ],
      answerIndex: 0,
      explanation: "Only the measured thickness compared with the published service limit decides it.",
    },
    scenario: {
      title: "A pad set at the limit",
      situation: "A vehicle comes in with a grinding noise from the front.",
      decisionPrompt: "What do you check first?",
      expectedConcepts: ["measure the friction material"],
      guidance: "Measure before replacing anything.",
    },
  };
}

function draftWith(seeds: TopicSeed[]): DomainDraft {
  return {
    definition: {
      id: "auto-repair",
      appName: "AUTO PATH",
      field: "auto repair",
      awardingBody: "ASE",
      summary: "Auto repair from the basics through to certification level.",
      sourceNote: "Written to the published ASE objectives.",
      defaultQualification: "Brakes (A5)",
      defaultGoal: "Service Technician",
      vocabulary: {
        qualification: "certification",
        qualifications: "certifications",
        section: "section",
        sections: "sections",
        lab: "job",
        ticket: "work order",
        exam: "exam",
      },
      feeds: { jobs: false, news: false, videos: false },
    },
    qualifications: [
      {
        id: "cert-brakes-a5",
        title: "Brakes (A5)",
        summary: "Brake systems service and diagnosis.",
        objectives: [
          { id: "o1", domain: "Hydraulics", text: "Diagnose hydraulic faults" },
          { id: "o2", domain: "Disc brakes", text: "Service disc brake assemblies" },
          { id: "o3", domain: "Drum brakes", text: "Service drum brake assemblies" },
        ],
      },
    ],
    seeds,
    sources: Object.fromEntries(
      seeds.map((seed) => [seed.slug, [{ label: "Service manual", url: "https://example.org/manual", kind: "reading" as const }]]),
    ),
  };
}

describe("subject QA", () => {
  it("accepts a sound subject", () => {
    const audit = auditDomainDraft(draftWith([soundSeed("pad-wear", "cert-brakes-a5"), soundSeed("rotor-service", "cert-brakes-a5", ["pad-wear"])]));
    expect(audit.findings.filter((f) => f.severity === "blocking")).toEqual([]);
    expect(audit.passed).toBe(true);
  });

  it("catches a prerequisite that does not exist", () => {
    const audit = auditDomainDraft(draftWith([soundSeed("pad-wear", "cert-brakes-a5", ["not-a-section"])]));
    expect(audit.passed).toBe(false);
    expect(audit.findings.some((f) => f.ruleId === "structure.prerequisites-resolve")).toBe(true);
    expect(failingSections(audit.findings)).toContain("pad-wear");
  });

  it("catches a section pointing at a qualification that does not exist", () => {
    const audit = auditDomainDraft(draftWith([soundSeed("pad-wear", "cert-nonexistent")]));
    expect(audit.findings.some((f) => f.ruleId === "domain.section-belongs-to-qualification")).toBe(true);
  });

  it("catches a practice question with no single believable answer", () => {
    const bad = soundSeed("pad-wear", "cert-brakes-a5");
    bad.practice.choices = ["The measured friction material against the manual figure", "None of the above", "Yes", "No"];
    const audit = auditDomainDraft(draftWith([bad]));
    expect(audit.findings.some((f) => f.ruleId === "questions.sound")).toBe(true);
  });

  it("catches a section with no recall practice", () => {
    const bad = soundSeed("pad-wear", "cert-brakes-a5");
    bad.recall = [];
    const audit = auditDomainDraft(draftWith([bad]));
    expect(audit.findings.some((f) => f.ruleId === "domain.section-has-recall")).toBe(true);
  });

  it("catches duplicate section ids", () => {
    const audit = auditDomainDraft(draftWith([soundSeed("pad-wear", "cert-brakes-a5"), soundSeed("pad-wear", "cert-brakes-a5")]));
    expect(audit.findings.some((f) => f.ruleId === "domain.section-id-unique")).toBe(true);
  });

  it("catches a starting qualification that is not in the subject", () => {
    const draft = draftWith([soundSeed("pad-wear", "cert-brakes-a5")]);
    draft.definition.defaultQualification = "Engine Performance (A8)";
    const audit = auditDomainDraft(draft);
    expect(audit.findings.some((f) => f.ruleId === "domain.definition-complete")).toBe(true);
  });
});
