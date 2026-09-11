import {
  LayoutDashboard,
  Route as RouteIcon,
  CalendarDays,
  BookOpen,
  Library,
  ClipboardList,
  FlaskConical,
  HelpCircle,
  Wrench,
  Briefcase,
  RotateCcw,
  Award,
  Users,
  FolderGit2,
  Bot,
  TrendingUp,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  group: "Study" | "Practice" | "Career" | "You";
}

export const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard, group: "Study" },
  { label: "My Path", to: "/my-path", icon: RouteIcon, group: "Study" },
  { label: "This Week", to: "/this-week", icon: CalendarDays, group: "Study" },
  { label: "Learn", to: "/learn", icon: BookOpen, group: "Study" },
  { label: "Resources", to: "/resources", icon: Library, group: "Study" },
  { label: "Assignments", to: "/assignments", icon: ClipboardList, group: "Practice" },
  { label: "Labs", to: "/labs", icon: FlaskConical, group: "Practice" },
  { label: "Quiz Me", to: "/quiz-me", icon: HelpCircle, group: "Practice" },
  { label: "Troubleshoot", to: "/troubleshoot", icon: Wrench, group: "Practice" },
  { label: "Career Mode", to: "/career-mode", icon: Briefcase, group: "Practice" },
  { label: "Review", to: "/review", icon: RotateCcw, group: "Practice" },
  { label: "Certifications", to: "/certifications", icon: Award, group: "Career" },
  { label: "Career Skills", to: "/career-skills", icon: Users, group: "Career" },
  { label: "Portfolio", to: "/portfolio", icon: FolderGit2, group: "Career" },
  { label: "AI Tutor", to: "/ai-tutor", icon: Bot, group: "You" },
  { label: "Progress", to: "/progress", icon: TrendingUp, group: "You" },
  { label: "Settings", to: "/settings", icon: SettingsIcon, group: "You" },
];

export const navGroups = ["Study", "Practice", "Career", "You"] as const;
