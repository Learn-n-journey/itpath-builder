/**
 * Where a failing check lives.
 *
 * A finding is only useful if the owner can get to the thing that is wrong,
 * so every check resolves to one destination: the topic page, the section of
 * the lesson at fault, the outside link that did not answer, or the tab in
 * the control room that owns the problem.
 */
import type { HealthCheck } from "./types";

export interface CheckTarget {
  /** Where to go. A path for in-app pages, a full URL for outside links. */
  href: string;
  label: string;
  /** Outside links open in a new tab. */
  external: boolean;
  /** When the problem lives on another control room tab instead of a page. */
  tab?: string;
}

/** Lesson stage anchors on the topic page. */
function anchorFor(kind: string): string {
  if (kind.startsWith("quiz") || kind.includes("question") || kind.includes("coverage")) return "#prove-it";
  if (kind.startsWith("lab") || kind.startsWith("work") || kind.startsWith("practice")) return "#try-it";
  if (kind.startsWith("video") || kind.startsWith("source")) return "#see-it";
  return "#read-it";
}

export function checkTarget(check: HealthCheck): CheckTarget | null {
  if (check.state === "healthy") return null;
  if (check.link) {
    const external = /^https?:\/\//i.test(check.link);
    return { href: check.link, label: check.linkLabel ?? (external ? "Open the link" : "Take me there"), external };
  }
  if (check.subjectId) {
    const kind = check.id.split(":").slice(2).join(":");
    return {
      href: `/topics/${check.subjectId}${anchorFor(kind)}`,
      label: "Take me to it",
      external: false,
    };
  }
  switch (check.area) {
    case "engine":
      return { href: "/topics", label: "Open the course list", external: false };
    case "imports":
      return { href: "/admin", label: "Open imports", external: false, tab: "imports" };
    case "sources":
      return { href: "/admin", label: "Open sources", external: false, tab: "sources" };
    case "content":
      return { href: "/admin", label: "Open content", external: false, tab: "content" };
    case "flows":
      return { href: "/admin", label: "Open journeys", external: false, tab: "flows" };
    default:
      return null;
  }
}
