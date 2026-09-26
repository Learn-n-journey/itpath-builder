import {
  Car,
  Brain,
  LayoutDashboard,
  Route as RouteIcon,
  CalendarDays,
  CalendarCheck2,
  BookOpen,
  Library,
  ClipboardList,
  FlaskConical,
  HelpCircle,
  Wrench,
  Briefcase,
  RotateCcw,
  Award,
  Building2,
  FolderGit2,
  Bot,
  BookMarked,
  TrendingUp,
  Timer,
  AlarmClock,
  Compass,
  Info,
  FileDown,
  Crown,
  Settings as SettingsIcon,
  SquareTerminal,
  CircuitBoard,
  Bug,
  Blocks,
  MessagesSquare,
  Layers,
  Medal,
  Newspaper,
  Video,
  Gauge,
  Cog,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { domain } from "@/domain/active";
import type { DomainDefinition } from "@/domain/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  group: "Home" | "Study" | "Practice" | "Connect" | "Career" | "You";
  /** One line explaining what this section is for, shown in the guide and as a tooltip. */
  description: string;
  /** True if this route is gated behind Pro. A small crown is shown in the sidebar. */
  pro?: boolean;
  /** Owner-only destinations are filtered again by the app shell before rendering. */
  ownerOnly?: boolean;
  /**
   * An outside feed this subject may not have. The item only appears when the
   * active subject switches that feed on.
   */
  feed?: keyof DomainDefinition["feeds"];
  /**
   * Tools that only make sense for certain subjects, by domain id. Left out,
   * the item shows for every subject.
   */
  subjects?: string[];
}


const allNavItems: NavItem[] = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    group: "Study",
    description: "Your progress at a glance and what to do today.",
  },
  {
    label: "My Path",
    to: "/my-path",
    icon: RouteIcon,
    group: "Study",
    description: "Your route through the curriculum, as a list or a map.",
  },
  {
    label: "Study Plan",
    to: "/study-plan",
    icon: CalendarDays,
    group: "Study",
    description: "Build one timed session from your open work and due reviews.",
  },
  {
    label: "Pomodoro",
    to: "/pomodoro",
    icon: Timer,
    group: "Study",
    description: "Focus timer that logs the minutes you actually study.",
  },
  {
    label: "Learn",
    to: "/learn",
    icon: BookOpen,
    group: "Study",
    description: "Explore topics, verified material, videos and news without changing your structured path.",
  },
  {
    label: "Resources",
    to: "/resources",
    icon: Library,
    group: "Study",
    description: "Official reading and video from vendors and course authors.",
  },
  {
    label: "Practice",
    to: "/practice",
    icon: ClipboardList,
    group: "Practice",
    description: "Written tasks graded against a model answer.",
  },
  {
    label: "Labs",
    to: "/labs",
    icon: FlaskConical,
    group: "Practice",
    description: "Step-by-step hands-on walkthroughs and fault drills.",
    pro: true,
  },
  {
    label: "Daily Challenge",
    to: "/daily-challenge",
    icon: CalendarCheck2,
    group: "Practice",
    description: "One short mixed set a day, the same for everyone, tracked against your past runs.",
  },
  {
    label: "Quiz Me",
    to: "/quiz-me",
    icon: HelpCircle,
    group: "Practice",
    description: "Randomised challenge questions on any topic or skill area.",
  },
  {
    label: "Troubleshoot",
    to: "/troubleshoot",
    icon: Wrench,
    group: "Practice",
    description: "Simulated incidents: diagnose, fix, verify and document.",
    pro: true,
  },
  {
    label: "Career Mode",
    to: "/career-mode",
    icon: Briefcase,
    group: "Practice",
    description: "A simulated support queue across five job roles.",
    subjects: ["it-cybersecurity"],
  },
  {
    label: "Exam Simulator",
    to: "/exam",
    icon: AlarmClock,
    group: "Practice",
    description: "A full-length timed knowledge challenge with a detailed performance report.",
    pro: true,
  },
  {
    label: "Command Line",
    to: "/command-line",
    icon: SquareTerminal,
    group: "Practice",
    description: "Practice CMD, PowerShell and Linux in safe, persistent virtual computers.",
    pro: true,
    subjects: ["it-cybersecurity"],
  },
  {
    label: "Virus Run",
    to: "/virus",
    icon: Bug,
    group: "Practice",
    description: "A quick arcade game: play as the virus and breach endlessly harder systems.",
    subjects: ["it-cybersecurity"],
  },
  {
    label: "BYTE//BREAK",
    to: "/byte-break",
    icon: Blocks,
    group: "Practice",
    description: "A polished tech block-matching game with cascades, combos and animated core effects.",
    subjects: ["it-cybersecurity"],
  },
  {
    label: "Explore Hardware",
    to: "/explore-hardware",
    icon: CircuitBoard,
    group: "Practice",
    description: "Tap through photos of a motherboard, RAM, GPU, drives, power supply, cooler and case to learn each part.",
    subjects: ["it-cybersecurity"],
  },
  {
    label: "OBD-II Scanner",
    to: "/obd-scanner",
    icon: Gauge,
    group: "Practice",
    description: "Plug a virtual scan tool into faulty vehicles and read codes, freeze frame and live data.",
    subjects: ["auto-repair"],
  },
  {
    label: "Explore the Engine",
    to: "/explore-engine",
    icon: Wrench,
    group: "Practice",
    description: "Tap through photos of an engine bay, a sectioned engine, alternator, starter, radiator, battery, brakes and spark plug.",
    subjects: ["auto-repair"],
  },
  {
    label: "Virtual Engine",
    to: "/engine-simulator",
    icon: Cog,
    group: "Practice",
    description: "Run a four stroke engine, change throttle, timing and mixture, and introduce faults.",
    subjects: ["auto-repair"],
  },
  {
    label: "Garage Match",
    to: "/garage-match",
    icon: Car,
    group: "Practice",
    description: "A match-3 restoration game: clear parts, fix cars and grow your garage.",
    subjects: ["auto-repair"],
  },

  {
    label: "Flashcards",
    to: "/flashcards",
    icon: Layers,
    group: "Practice",
    description: "Quick spaced repetition cards from the key terms, quick reference and exam traps in each section.",
  },
  {
    label: "Review",
    to: "/review",
    icon: RotateCcw,
    group: "Practice",
    description: "Spaced repetition, your mistake log and a quiz on your weak areas.",
  },
  {
    label: "Tech Jobs",
    feed: "jobs",
    to: "/tech-jobs",
    icon: Building2,
    group: "Career",
    description: "Live IT job listings, filtered by location and role.",
  },
  {
    label: "Portfolio",
    to: "/portfolio",
    icon: FolderGit2,
    group: "Career",
    description: "Write up completed work as evidence for employers.",
  },
  {
    label: "Achievements",
    to: "/achievements",
    icon: Medal,
    group: "You",
    description: "Skill progress, your streak and every badge earned from recorded work.",
  },
  {
    label: "AI Tutor",
    to: "/ai-tutor",
    icon: Bot,
    group: "You",
    description: "Ask anything and get answers that know your weak areas.",
    pro: true,
  },
  {
    label: "Second Brain",
    to: "/knowledge",
    icon: Brain,
    group: "You",
    description: `Save notes, links, videos and files; ${domain.appName} reads them and connects them to your topics.`,
    pro: true,
  },
  {
    label: "Tech News",
    feed: "news",
    to: "/tech-news",
    icon: Newspaper,
    group: "Connect",
    description: "A live feed of technology headlines, kept separate from your studies.",
  },
  {
    label: "Tech Videos",
    feed: "videos",
    to: "/tech-videos",
    icon: Video,
    group: "Connect",
    description: "A scrolling feed of technology videos, played in each platform's own player.",
  },
  {
    label: "Auto News",
    to: "/auto-news",
    icon: Newspaper,
    group: "Connect",
    description: "A live feed of automotive headlines for working and future technicians.",
    subjects: ["auto-repair"],
  },
  {
    label: "Auto Videos",
    to: "/auto-videos",
    icon: Video,
    group: "Connect",
    description: "A scrolling feed of repair and diagnostic videos, played in each creator's own player.",
    subjects: ["auto-repair"],
  },
  {
    label: "Community",
    to: "/community",
    icon: MessagesSquare,
    group: "Connect",
    description: `Connect with other ${domain.appName} learners.`,
  },
  {
    label: "Bookmarks",
    to: "/bookmarks",
    icon: BookMarked,
    group: "You",
    description: "Everything you saved, plus your topic notes.",
  },
  {
    label: "Progress",
    to: "/progress",
    icon: TrendingUp,
    group: "You",
    description: "Scores, trends, your learner profile and career skills.",
  },
  {
    label: "How it works",
    to: "/guide",
    icon: Compass,
    group: "You",
    description: "What each section is for and how scoring is calculated.",
  },
  {
    label: "Study record",
    to: "/record",
    icon: FileDown,
    group: "You",
    description: "Download a transcript of your recorded work, or back up and restore progress.",
  },
  {
    label: "About",
    to: "/about",
    icon: Info,
    group: "You",
    description: `Who built ${domain.appName}, version number and contact details.`,
  },
  {
    label: "Go Pro",
    to: "/pricing",
    icon: Crown,
    group: "You",
    description: "One-time upgrade that unlocks the AI Tutor, AI grading, labs and more.",
  },
  {
    label: "Settings",
    to: "/settings",
    icon: SettingsIcon,
    group: "You",
    description: "Your goal, experience level, study days and session length.",
  },
  {
    label: "Admin",
    to: "/admin",
    icon: ShieldCheck,
    group: "You",
    description: "Owner-only control room for health checks, content sync, releases and maintenance.",
    ownerOnly: true,
  },

];

export const navGroups = ["Home", "Study", "Practice", "Connect", "Career", "You"] as const;

/** Only the pages that make sense for the subject the app is running. */
const autoLabels: Partial<Record<string, Pick<NavItem, "label" | "description">>> = {
  "/my-path": { label: "Training Plan", description: "Your technician route through vehicle systems, shop skills and certification preparation." },
  "/study-plan": { label: "Training Plan", description: "Build one timed training session from open work and due checks." },
  "/practice": { label: "Skill Practice", description: "Written automotive tasks graded against a model answer." },
  "/labs": { label: "Shop Practice", description: "Step-by-step hands-on walkthroughs, inspection exercises and fault drills." },
  "/troubleshoot": { label: "Repair Orders", description: "Work customer complaints through inspection, testing, diagnosis, repair and verification." },
  "/exam": { label: "Certification Test", description: "A full-length timed knowledge challenge with a detailed performance report." },
  "/resources": { label: "Service Resources", description: "Official reading, references and video for the systems you are learning." },
  "/review": { label: "Recheck", description: "Spaced repetition, your mistake log and targeted checks on weak systems." },
  "/portfolio": { label: "Work Evidence", description: "Turn completed training and diagnostic work into evidence of technician capability." },
  "/progress": { label: "Shop Progress", description: "Knowledge, diagnostic skill, training trends and technician development." },
};

/** Only the pages that make sense for the subject the app is running. */
export const navItems: NavItem[] = allNavItems
  .filter(
    (item) =>
      (!item.feed || domain.feeds[item.feed]) &&
      (!item.subjects || item.subjects.includes(domain.id)),
  )
  .map((item) => domain.id === "auto-repair" && autoLabels[item.to] ? { ...item, ...autoLabels[item.to] } : item);
