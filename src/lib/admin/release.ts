/**
 * The content release gate.
 *
 * Imported → Validated → Preview → Approved → Live. Importing alone never
 * puts anything in front of a learner, failed validation blocks publication,
 * and the previous good version is always kept so a rollback is possible.
 *
 * Everything here is pure; the server functions apply it.
 */
import type { ContentStatus, ContentVersion } from "./types";

/** A stable fingerprint of a piece of content, so changes are detected by content, not time. */
export function contentHash(value: unknown): string {
  const text = typeof value === "string" ? value : stableStringify(value);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 ^= code;
    h1 = Math.imul(h1, 16777619);
    h2 = Math.imul(h2 ^ code, 2246822519);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

const ALLOWED: Record<ContentStatus, ContentStatus[]> = {
  imported: ["validated", "rejected"],
  validated: ["preview", "approved", "rejected"],
  preview: ["approved", "rejected"],
  approved: ["live", "rejected"],
  live: ["superseded", "rolled_back"],
  superseded: ["live"],
  rolled_back: ["validated", "live"],
  rejected: ["validated"],
};

export interface TransitionContext {
  validationPassed?: boolean;
  /** Set when the caller is a verified owner. Approval and publishing need it. */
  owner?: boolean;
}

export interface TransitionResult {
  ok: boolean;
  reason?: string;
}

export function canTransition(from: ContentStatus, to: ContentStatus, context: TransitionContext = {}): TransitionResult {
  if (!ALLOWED[from]?.includes(to)) {
    return { ok: false, reason: `Content at "${from}" cannot move straight to "${to}".` };
  }
  if ((to === "validated" || to === "preview" || to === "approved" || to === "live") && context.validationPassed === false) {
    return { ok: false, reason: "Validation failed, so this content cannot be published." };
  }
  if ((to === "approved" || to === "live" || to === "rolled_back") && context.owner !== true) {
    return { ok: false, reason: "Only the owner can approve, publish or roll back content." };
  }
  return { ok: true };
}

/** The version a rollback would restore: the most recent good one that is not live now. */
export function rollbackTarget(versions: ContentVersion[]): ContentVersion | undefined {
  return versions
    .filter((version) => version.status === "superseded" || (version.status === "approved" && !version.publishedAt))
    .filter((version) => version.validation?.passed !== false)
    .sort((a, b) => (b.publishedAt ?? b.approvedAt ?? b.importedAt).localeCompare(a.publishedAt ?? a.approvedAt ?? a.importedAt))[0];
}

export function canRollback(versions: ContentVersion[]): TransitionResult {
  const live = versions.find((version) => version.status === "live");
  if (!live) return { ok: false, reason: "Nothing is live for this topic, so there is nothing to roll back." };
  const target = rollbackTarget(versions);
  if (!target) return { ok: false, reason: "There is no earlier known-good version kept, so a rollback would leave nothing live." };
  return { ok: true };
}

/** True when what is live no longer matches the version that was imported. */
export function liveMatchesVersion(liveHash: string | null | undefined, version: ContentVersion | undefined): boolean {
  if (!version) return false;
  return Boolean(liveHash) && liveHash === version.contentHash;
}

export const LIFECYCLE_ORDER: ContentStatus[] = ["imported", "validated", "preview", "approved", "live"];

export function lifecycleLabel(status: ContentStatus): string {
  switch (status) {
    case "imported":
      return "Imported";
    case "validated":
      return "Validated";
    case "preview":
      return "In preview";
    case "approved":
      return "Approved";
    case "live":
      return "Live";
    case "superseded":
      return "Replaced";
    case "rolled_back":
      return "Rolled back";
    case "rejected":
      return "Blocked";
  }
}
