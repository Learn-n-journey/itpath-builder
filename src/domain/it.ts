import type { DomainDefinition } from "./types";

/** The IT and cybersecurity domain this app ships with. */
export const itDomain: DomainDefinition = {
  id: "it-cybersecurity",
  appName: "IT PATH",
  field: "IT and cybersecurity",
  awardingBody: "CompTIA",
  summary:
    "IT and cybersecurity study from first principles through to certification level, covering hardware, operating systems, networking, security, Linux, servers and cloud.",
  sourceNote:
    "Built to the published CompTIA exam objectives, with primary documentation and standards as reading.",
  defaultQualification: "CompTIA Tech+",
  defaultGoal: "IT Support Specialist",
  vocabulary: {
    qualification: "certification",
    qualifications: "certifications",
    section: "section",
    sections: "sections",
    lab: "lab",
    ticket: "ticket",
    exam: "exam",
  },
  feeds: { jobs: true, news: true, videos: true },
};
