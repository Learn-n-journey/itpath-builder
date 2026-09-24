import type { DomainDefinition } from "./types";

/** The IT and cybersecurity domain this app ships with. */
export const itDomain: DomainDefinition = {
  id: "it-cybersecurity",
  appName: "IT PATH",
  field: "IT and cybersecurity",
  awardingBody: "IT PATH",
  summary:
    "IT and cybersecurity learning from first principles through advanced applied skills, covering hardware, operating systems, networking, security, Linux, servers and cloud.",
  sourceNote:
    "Built around practical technical skills, with primary documentation and standards as reading.",
  defaultQualification: "Technology Foundations",
  defaultGoal: "IT Support Specialist",
  vocabulary: {
    qualification: "learning path",
    qualifications: "learning paths",
    section: "section",
    sections: "sections",
    lab: "lab",
    ticket: "ticket",
    exam: "exam",
  },
  feeds: { jobs: true, news: true, videos: true },
};
