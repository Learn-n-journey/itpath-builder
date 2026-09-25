/**
 * Community rooms represent recurring learner groups, not curriculum topics.
 * Specific lesson concepts belong in post text/tags; communities are the people
 * and purposes learners come back to.
 */
export const GENERAL_ROOM = "general";

export const COMMUNITY_ROOMS = [
  { id: GENERAL_ROOM, label: "General IT", description: "Anything IT related", tagline: "The common room for the whole IT PATH community.", about: "Talk across IT disciplines, share useful discoveries, and meet learners outside your usual lane." },
  { id: "new-to-it", label: "New to IT", description: "Beginner questions welcome", tagline: "Start here. No question is too basic.", about: "A welcoming place for first steps, foundational questions, terminology, study habits, and figuring out where to begin." },
  { id: "career-changers", label: "Career Changers", description: "Moving into IT from another field", tagline: "Turn the experience you already have into your next career.", about: "Compare paths into IT, translate existing skills, share transition progress, and learn from people making the same move." },
  { id: "help-desk-support", label: "Help Desk & Support", description: "Tickets, users, and support work", tagline: "Solve the problems users actually bring you.", about: "Practice support thinking, ticket handling, communication, desktop troubleshooting, and the day-to-day work of helping users." },
  { id: "home-lab-builders", label: "Home Lab Builders", description: "Labs, VMs, servers, and gear", tagline: "Build it. Break it. Figure out why.", about: "Share lab setups, virtual machines, servers, network experiments, hardware projects, and what you learned while building them." },
  { id: "certification-study", label: "Certification Study", description: "A+, Network+, Security+, CCNA, and more", tagline: "Study with people working toward the same finish line.", about: "Discuss study strategies, objectives, practice habits, exam preparation, and lessons learned without turning the community into an answer dump." },
  { id: "networking-crew", label: "Networking Crew", description: "Networks, routing, switching, and services", tagline: "Follow the packet. Understand the network.", about: "Talk switching, routing, addressing, DNS, DHCP, wireless, troubleshooting, labs, and the systems that keep devices connected." },
  { id: "cybersecurity", label: "Cybersecurity", description: "Security learning and defensive skills", tagline: "Learn to protect systems by understanding how they fail.", about: "Discuss defensive security, hardening, identity, monitoring, risk, secure configuration, and responsible security learning." },
  { id: "linux-open-source", label: "Linux & Open Source", description: "Linux, command line, and open source", tagline: "Get comfortable where the terminal starts.", about: "Learn Linux administration, shell skills, permissions, services, troubleshooting, distributions, and open-source tools together." },
  { id: "cloud-devops", label: "Cloud & DevOps", description: "Cloud platforms, containers, and automation", tagline: "Build, automate, deploy, repeat.", about: "Explore cloud services, containers, infrastructure, CI/CD, automation, reliability, and modern operations workflows." },
  { id: "coding-automation", label: "Coding & Automation", description: "Python, PowerShell, scripting, and tools", tagline: "Automate the boring parts and understand the code.", about: "Share scripts, ask programming questions, learn Python and PowerShell, and build small tools that make technical work easier." },
  { id: "build-show", label: "Build & Show", description: "Share projects, portfolios, and things you made", tagline: "Show the work, not just the result.", about: "Share finished and unfinished projects, explain what you built, get constructive feedback, and turn hands-on work into portfolio evidence." },
  { id: "troubleshooting-help", label: "Troubleshooting Help", description: "Work through technical problems together", tagline: "Bring the symptoms. Work the problem.", about: "Describe what is happening, what changed, and what you already tried. Work through technical problems methodically with other learners." },
  { id: "job-search-interviews", label: "Job Search & Interviews", description: "Resumes, applications, and interviews", tagline: "Turn learning into a real opportunity.", about: "Work on resumes, interviews, job searches, portfolios, role expectations, and the practical transition from learner to applicant." },
  { id: "study-accountability", label: "Study Accountability", description: "Goals, check-ins, and study momentum", tagline: "Keep showing up.", about: "Set realistic learning goals, share check-ins, celebrate consistency, and help other learners maintain momentum without turning progress into a competition." },
  { id: "off-topic", label: "Off Topic", description: "Conversation beyond IT", tagline: "Sometimes learners just need a place to talk.", about: "A casual space for conversations that do not fit the technical communities while still following IT PATH community standards." },
] as const;

export type CommunityRoom = (typeof COMMUNITY_ROOMS)[number];

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

export function communityForRoom(room: string): CommunityRoom {
  return COMMUNITY_ROOMS.find((entry) => entry.id === room) ?? COMMUNITY_ROOMS[0];
}

export function roomTitle(room: string): string {
  return communityForRoom(room).label;
}
