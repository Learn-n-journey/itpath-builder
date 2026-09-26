import { domain } from "@/domain/active";

/**
 * Community rooms represent recurring learner groups, not curriculum topics.
 * Specific lesson concepts belong in post text/tags; communities are the people
 * and purposes learners come back to.
 */
const IT_GENERAL_ROOM = "general";
const AUTO_GENERAL_ROOM = "auto-general";
export const GENERAL_ROOM = domain.id === "auto-repair" ? AUTO_GENERAL_ROOM : IT_GENERAL_ROOM;

const IT_COMMUNITY_ROOMS = [
  { id: IT_GENERAL_ROOM, label: "General IT", description: "Anything IT related", tagline: "The common room for the whole IT PATH community.", about: "Talk across IT disciplines, share useful discoveries, and meet learners outside your usual lane." },
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

const AUTO_COMMUNITY_ROOMS = [
  { id: AUTO_GENERAL_ROOM, label: "General Garage", description: "Anything automotive", tagline: "The common bay for the whole AUTO PATH community.", about: "Talk across automotive systems, share useful discoveries, and meet learners and technicians outside your usual lane." },
  { id: "auto-new-to-auto", label: "New to Auto", description: "Beginner questions welcome", tagline: "Start here. Learn the shop without pretending you already know it.", about: "A welcoming place for first tools, terminology, safety, maintenance basics, study habits, and figuring out where to begin." },
  { id: "auto-diy-garage", label: "DIY Garage", description: "Home repairs, maintenance, and tools", tagline: "Work on your own car and learn why the repair works.", about: "Share home-garage repairs, maintenance, tool choices, lessons learned, and safe ways to build hands-on experience." },
  { id: "auto-aspiring-techs", label: "Aspiring Technicians", description: "Preparing for professional shop work", tagline: "Turn training into technician capability.", about: "Discuss entry-level shop skills, career transitions, expectations, training progress, and preparing for professional automotive work." },
  { id: "auto-ase-study", label: "ASE Study", description: "Certification preparation and study", tagline: "Know the system, not just the answer.", about: "Discuss ASE preparation, objectives, study strategies, practice habits, and lessons learned without turning the community into an answer dump." },
  { id: "auto-diagnostics", label: "Diagnostics", description: "Symptoms, testing, scan data, and evidence", tagline: "Test before you replace.", about: "Work through symptoms, diagnostic strategy, scan data, measurements, possible causes, and evidence-based fault isolation." },
  { id: "auto-electrical", label: "Electrical & Electronics", description: "Circuits, meters, modules, and wiring", tagline: "Follow the circuit. Prove the fault.", about: "Talk batteries, starting and charging, wiring, voltage drop, meters, sensors, modules, networks, and electrical diagnosis." },
  { id: "auto-engine", label: "Engine & Drivability", description: "Engine systems and performance diagnosis", tagline: "Air, fuel, spark, compression, timing, evidence.", about: "Discuss engine mechanical systems, fuel and ignition, emissions, drivability symptoms, testing, and repair verification." },
  { id: "auto-chassis", label: "Brakes, Steering & Suspension", description: "Chassis systems, inspection, and repair", tagline: "Inspect the vehicle. Understand what the driver feels.", about: "Discuss brakes, steering, suspension, tires, alignment symptoms, inspection findings, measurements, and repair decisions." },
  { id: "auto-tools-shop", label: "Tools & Shop Life", description: "Tools, workflow, safety, and the working shop", tagline: "Use the right tool and build good habits.", about: "Compare hand tools, scan tools, meters, lifts, safety practices, workflow, organization, and lessons from the shop." },
  { id: "auto-build-show", label: "Build & Show", description: "Share repairs, restorations, and projects", tagline: "Show the work, not just the finished car.", about: "Share repairs, restorations, upgrades, diagnostic wins, unfinished projects, and what you learned along the way." },
  { id: "auto-troubleshooting-help", label: "Repair Help", description: "Work through vehicle problems together", tagline: "Bring the complaint. Bring the evidence.", about: "Describe the vehicle, symptom, conditions, codes, measurements, and what you already tested. Work the problem methodically with other learners." },
  { id: "auto-career-shop", label: "Careers & Shop Talk", description: "Jobs, interviews, dealerships, and independent shops", tagline: "Learn what the work is really like.", about: "Discuss technician careers, interviews, shop environments, tools, training, pay structures, professional development, and moving from learner to applicant." },
  { id: "auto-study-accountability", label: "Training Accountability", description: "Goals, check-ins, and training momentum", tagline: "Keep showing up.", about: "Set realistic training goals, share check-ins, celebrate consistency, and help other learners maintain momentum." },
  { id: "auto-off-topic", label: "Off Topic", description: "Conversation beyond the garage", tagline: "Sometimes people just need a place to talk.", about: "A casual space for conversations that do not fit the automotive communities while still following AUTO PATH community standards." },
] as const;

export const COMMUNITY_ROOMS = domain.id === "auto-repair" ? AUTO_COMMUNITY_ROOMS : IT_COMMUNITY_ROOMS;

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
