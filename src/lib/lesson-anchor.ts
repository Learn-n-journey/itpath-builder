/**
 * Anchor ids for lesson parts, shared by the lesson reader (which renders
 * them) and search (which links straight to them).
 */
export function slugifyHeading(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function lessonPartAnchor(heading: string): string {
  return `lesson-part-${slugifyHeading(heading)}`;
}
