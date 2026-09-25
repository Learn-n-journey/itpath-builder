/**
 * Community rooms represent recurring learner groups, not curriculum topics.
 * Specific lesson concepts belong in post text/tags; communities are the people
 * and purposes learners come back to.
 */
export const GENERAL_ROOM = "general";

export const COMMUNITY_ROOMS = [
  { id: GENERAL_ROOM, label: "General IT", description: "Anything IT related" },
  { id: "new-to-it", label: "New to IT", description: "Beginner questions welcome" },
  { id: "career-changers", label: "Career Changers", description: "Moving into IT from another field" },
  { id: "help-desk-support", label: "Help Desk & Support", description: "Tickets, users, and support work" },
  { id: "home-lab-builders", label: "Home Lab Builders", description: "Labs, VMs, servers, and gear" },
  { id: "certification-study", label: "Certification Study", description: "A+, Network+, Security+, CCNA, and more" },
  { id: "networking-crew", label: "Networking Crew", description: "Networks, routing, switching, and services" },
  { id: "cybersecurity", label: "Cybersecurity", description: "Security learning and defensive skills" },
  { id: "linux-open-source", label: "Linux & Open Source", description: "Linux, command line, and open source" },
  { id: "cloud-devops", label: "Cloud & DevOps", description: "Cloud platforms, containers, and automation" },
  { id: "coding-automation", label: "Coding & Automation", description: "Python, PowerShell, scripting, and tools" },
  { id: "build-show", label: "Build & Show", description: "Share projects, portfolios, and things you made" },
  { id: "troubleshooting-help", label: "Troubleshooting Help", description: "Work through technical problems together" },
  { id: "job-search-interviews", label: "Job Search & Interviews", description: "Resumes, applications, and interviews" },
  { id: "study-accountability", label: "Study Accountability", description: "Goals, check-ins, and study momentum" },
  { id: "off-topic", label: "Off Topic", description: "Conversation beyond IT" },
] as const;

export function roomForTopic(_topicId: string): string {
  return GENERAL_ROOM;
}

/** Curriculum topics are no longer rooms. Kept for compatibility with older callers. */
export function topicForRoom(_room: string): string | null {
  return null;
}

export function isValidRoom(room: string): boolean {
  return COMMUNITY_ROOMS.some((entry) => entry.id === room);
}

export function roomTitle(room: string): string {
  return COMMUNITY_ROOMS.find((entry) => entry.id === room)?.label ?? "General IT";
}
