import type { CurriculumWeek } from "@/lib/app-data/types";

/**
 * Curriculum weeks reference existing topic, resource, lab, assignment and quiz ids.
 * Reading, practice, labs, assignments and reviews are derived from those systems by
 * src/lib/week-engine.ts, so no week duplicates content that already exists elsewhere.
 */
export const weeks: CurriculumWeek[] = [
  {
    id: "week-y1-m1-w1",
    year: 1,
    month: 1,
    week: 1,
    title: "Computers and operating systems",
    summary:
      "Learn what the physical machine is made of and how the operating system turns that hardware into a usable system.",
    topicIds: ["topic-computer-hardware-basics", "topic-operating-systems-overview"],
    videoResourceIds: ["resource-professor-messer-video-training", "resource-microsoft-learn-shows"],
    referenceResourceIds: [
      "resource-microsoft-explore-computers",
      "resource-microsoft-windows-architecture",
      "resource-comptia-a-plus-core-1",
    ],
    quizId: "quiz-week-1",
    assessmentQuizId: "quiz-week-1-assessment",
  },
  {
    id: "week-y1-m1-w2",
    year: 1,
    month: 1,
    week: 2,
    title: "Networking concepts and the command line",
    summary:
      "Understand how devices talk to each other, and start working confidently in a terminal instead of a graphical interface.",
    topicIds: ["topic-basic-networking-concepts", "topic-command-line-fundamentals"],
    videoResourceIds: ["resource-professor-messer-youtube", "resource-linux-foundation-videos"],
    referenceResourceIds: ["resource-cisco-networking-basics", "resource-microsoft-bash-introduction"],
    quizId: "quiz-week-2",
    assessmentQuizId: "quiz-week-2-assessment",
  },
  {
    id: "week-y1-m1-w3",
    year: 1,
    month: 1,
    week: 3,
    title: "Virtualization and the IT profession",
    summary:
      "Build a safe practice environment with virtual machines and learn how real IT teams and tickets are organised.",
    topicIds: ["topic-virtualization-basics", "topic-it-career-overview"],
    videoResourceIds: ["resource-microsoft-learn-shows", "resource-professor-messer-video-training"],
    referenceResourceIds: ["resource-microsoft-hyper-v-overview", "resource-comptia-explore-careers"],
    quizId: "quiz-week-3",
    assessmentQuizId: "quiz-week-3-assessment",
  },
  {
    id: "week-y1-m1-w4",
    year: 1,
    month: 1,
    week: 4,
    title: "Addressing and name resolution",
    summary:
      "Work with IP addressing, gateways and DNS so you can diagnose the connectivity problems that fill a real ticket queue.",
    topicIds: ["topic-networking-basics", "topic-dns-fundamentals"],
    videoResourceIds: ["resource-professor-messer-youtube"],
    referenceResourceIds: ["resource-cisco-networking-essentials", "resource-cloudflare-dns-concepts"],
    quizId: "quiz-week-4",
    assessmentQuizId: "quiz-week-4-assessment",
  },
];
