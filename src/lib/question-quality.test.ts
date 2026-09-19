import { describe, expect, it } from "vitest";

import type { Question } from "@/lib/app-data/types";
import { answerFormatIssues, questionIssues } from "@/lib/question-quality";

function item(prompt: string, choices: string[], answer = choices[0] ?? ""): Question {
  return {
    id: "format-test",
    topicId: "format-topic",
    quizId: "format-quiz",
    certificationId: "format-cert",
    prompt,
    type: "multiple_choice",
    choices,
    correctAnswer: [answer],
    acceptableAnswers: [answer],
    explanation: "The evidence in the prompt makes this the defensible answer.",
    difficulty: "standard",
    mistakeCategory: "diagnosis",
    requiresReasoning: true,
  };
}

describe("answer choices match the format requested by the question", () => {
  it("rejects actions mixed into a why question", () => {
    const question = item(
      "Why does replacing a spinning hard disk with an SSD improve everyday responsiveness on an older computer?",
      [
        "The SSD avoids mechanical seek delay and handles small random reads much faster.",
        "Confirm that the charger and outlet are supplying power.",
        "Replace the display cable and test the external monitor.",
        "Run a memory test before changing the storage device.",
      ],
    );
    expect(answerFormatIssues(question)).toContain(
      "an option is formatted as an action instead of an explanation requested by the question",
    );
  });

  it("rejects factual claims mixed into an action question", () => {
    const question = item(
      "A workstation shuts down while rendering. At the reproduce and record step, what are you actually doing?",
      [
        "Start a rendering job and monitor temperature, power draw, and the shutdown time.",
        "A blue screen means the storage drive is failing.",
        "The cooling system is adequate when every fan spins.",
        "Higher power-supply wattage fixes every shutdown.",
      ],
    );
    expect(answerFormatIssues(question)).toContain(
      "not every option is formatted as an action requested by the question",
    );
  });

  it("accepts four plausible actions for an action question", () => {
    const question = item(
      "A computer shuts down under load and feels hot. What should you check first?",
      [
        "Inspect the fans, vents, heatsink contact, and processor temperature.",
        "Test the wall outlet and power cable under the same workload.",
        "Review system logs for the shutdown time and thermal warnings.",
        "Measure power-supply output while reproducing the heavy workload.",
      ],
    );
    expect(answerFormatIssues(question)).toEqual([]);
  });

  it("permanently rejects the generic key-idea template", () => {
    const question = item(
      "Which of these is one of the ideas worth keeping from Computer Hardware Basics?",
      [
        "Hardware faults can be narrowed using power, connection, heat, capacity, and component evidence.",
        "TCP uses a three-way handshake before application data moves.",
        "A Type 1 hypervisor runs directly on host hardware.",
        "A DNS resolver maps a hostname to an address record.",
      ],
    );
    expect(questionIssues(question)).toContain("prompt tests recognition of the section rather than applying it");
  });

  it("rejects recognition-only term matching", () => {
    const question = item(
      "Which term matches this description: a named reusable block of instructions that can return a value?",
      ["Function", "Driver", "Filesystem", "Process"],
    );
    expect(questionIssues(question)).toContain("prompt tests recognition of the section rather than applying it");
  });

  it("rejects negative trick wording", () => {
    const question = item(
      "A technician is comparing secure remote-access methods. Which option is NOT appropriate for this environment?",
      [
        "Use a managed VPN with multifactor authentication.",
        "Use SSH with keys and restricted source addresses.",
        "Use a zero-trust access proxy with device checks.",
        "Use an approved remote-support gateway with audit logs.",
      ],
    );
    expect(questionIssues(question)).toContain("prompt relies on negative or exception wording instead of demonstrating knowledge");
  });
});