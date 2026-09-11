import type { AnnotationKind, Bookmark, Note, UserData } from "@/lib/app-data/types";

/** A single item anywhere in IT PATH that can carry notes and a bookmark. */
export interface AnnotationTarget {
  kind: AnnotationKind;
  id: string;
  /** Human readable label used in the bookmarks view. */
  label: string;
  /** Where the bookmark should take the learner. */
  href: string;
}

const legacyField: Record<AnnotationKind, keyof Note & keyof Bookmark> = {
  topic: "topicId",
  lesson: "lessonId",
  resource: "resourceId",
  lab: "labId",
  assignment: "assignmentId",
  quiz: "quizId",
  project: "projectId",
};

export const annotationKindLabel: Record<AnnotationKind, string> = {
  topic: "Topic",
  lesson: "Lesson",
  resource: "Resource",
  lab: "Lab",
  assignment: "Assignment",
  quiz: "Quiz",
  project: "Project",
};

function matches(record: Note | Bookmark, target: AnnotationTarget): boolean {
  if (record.entityKind && record.entityId) {
    return record.entityKind === target.kind && record.entityId === target.id;
  }
  const field = legacyField[target.kind];
  return record[field] === target.id;
}

/** Every note attached to a target, newest first. */
export function notesFor(user: UserData, target: AnnotationTarget): Note[] {
  return user.notes
    .filter((note) => matches(note, target))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function bookmarkFor(user: UserData, target: AnnotationTarget): Bookmark | undefined {
  return user.bookmarks.find((bookmark) => matches(bookmark, target));
}

export function isBookmarked(user: UserData, target: AnnotationTarget): boolean {
  return Boolean(bookmarkFor(user, target));
}

export function buildNote(target: AnnotationTarget, body: string, title?: string): Note {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: title?.trim() || `${target.label} note`,
    body,
    entityKind: target.kind,
    entityId: target.id,
    [legacyField[target.kind]]: target.id,
    createdAt: now,
    updatedAt: now,
  } as Note;
}

export function buildBookmark(target: AnnotationTarget): Bookmark {
  return {
    id: crypto.randomUUID(),
    label: target.label,
    href: target.href,
    entityKind: target.kind,
    entityId: target.id,
    [legacyField[target.kind]]: target.id,
    createdAt: new Date().toISOString(),
  } as Bookmark;
}

/** The kind of a stored record, resolving older records that predate entityKind. */
export function recordKind(record: Note | Bookmark): AnnotationKind | undefined {
  if (record.entityKind) return record.entityKind;
  const entry = (Object.entries(legacyField) as [AnnotationKind, keyof Note & keyof Bookmark][]).find(
    ([, field]) => Boolean(record[field]),
  );
  return entry?.[0];
}

export function recordEntityId(record: Note | Bookmark): string | undefined {
  if (record.entityId) return record.entityId;
  const kind = recordKind(record);
  if (!kind) return undefined;
  const value = record[legacyField[kind]];
  return typeof value === "string" ? value : undefined;
}

export interface BookmarkView {
  bookmark: Bookmark;
  kind: AnnotationKind;
  kindLabel: string;
  noteCount: number;
}

/** All bookmarks with their kind and attached note count, newest first. */
export function bookmarkViews(user: UserData): BookmarkView[] {
  return [...user.bookmarks]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((bookmark) => {
      const kind = recordKind(bookmark) ?? "resource";
      const entityId = recordEntityId(bookmark);
      const noteCount = entityId
        ? user.notes.filter(
            (note) => recordEntityId(note) === entityId && (recordKind(note) ?? kind) === kind,
          ).length
        : 0;
      return { bookmark, kind, kindLabel: annotationKindLabel[kind], noteCount };
    });
}
