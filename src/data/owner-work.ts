/**
 * Build-time snapshot of the owner's recall workbooks.
 *
 * The live copy is pulled from the database at runtime; this file is the
 * offline fallback, so a topic's work never vanishes because a load failed.
 */
import type { OwnerTopicWork } from "@/lib/owner-work-shared";

export const ownerTopicWork: Record<string, OwnerTopicWork> = {};
