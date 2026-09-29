import { supabase } from "@/integrations/supabase/client";
import { activeDomainKey } from "@/lib/active-domain";
import { sanitizeUser } from "@/lib/app-data/storage";
import { APP_DATA_VERSION, type UserData } from "@/lib/app-data/types";

export interface CloudFetchResult {
  ok: boolean;
  found: boolean;
  user: UserData | null;
  error?: string;
}

interface CloudPayload {
  user?: unknown;
  usersByDomain?: Record<string, unknown>;
}

function subjectId(): string {
  return activeDomainKey().split("@")[0] ?? "it-cybersecurity";
}

/** Reads the signed-in learner's saved progress for the active Path. */
export async function fetchCloudState(userId: string): Promise<CloudFetchResult> {
  const { data, error } = await supabase
    .from("user_state")
    .select("data, version")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, found: false, user: null, error: error.message };
  if (!data) return { ok: true, found: false, user: null };

  const payload = data.data as CloudPayload | null;
  const subject = subjectId();
  const scoped = payload?.usersByDomain?.[subject];
  // Legacy snapshots predate multiple Paths and belong to IT PATH. Never use
  // them to seed another Path.
  const legacy = subject === "it-cybersecurity" ? payload?.user : undefined;
  const raw = scoped ?? legacy;
  if (!raw) return { ok: true, found: false, user: null };
  return { ok: true, found: true, user: sanitizeUser(raw) };
}

/** Writes the active Path without replacing the learner's other Path snapshots. */
export async function pushCloudState(
  userId: string,
  user: UserData,
): Promise<{ ok: boolean; error?: string; expired?: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session || session.user.id !== userId) {
    return {
      ok: false,
      expired: true,
      error: "Your sign-in has expired. Sign in again to keep saving your progress.",
    };
  }

  const { data: existing, error: readError } = await supabase
    .from("user_state")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };

  const payload = (existing?.data as CloudPayload | null) ?? {};
  const usersByDomain = { ...(payload.usersByDomain ?? {}) };
  // Migrate the old single IT PATH snapshot the first time any Path saves.
  if (payload.user && !usersByDomain["it-cybersecurity"]) {
    usersByDomain["it-cybersecurity"] = payload.user;
  }
  usersByDomain[subjectId()] = user;

  const { error } = await supabase.from("user_state").upsert(
    {
      user_id: userId,
      version: APP_DATA_VERSION,
      data: { usersByDomain } as unknown as never,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Rough measure of how much real work a snapshot contains. */
export function activityCount(user: UserData): number {
  return (
    Object.keys(user.topicProgress).length +
    user.quizAttempts.length +
    Object.keys(user.quizPasses ?? {}).length +
    user.assignmentAttempts.length +
    user.labAttempts.length +
    (user.masteryCheckAttempts?.length ?? 0) +
    user.ticketAttempts.length +
    user.incidentAttempts.length +
    user.terminalAttempts.length +
    user.recallResponses.length +
    user.practiceResponses.length +
    user.studySessions.length +
    user.notes.length +
    user.bookmarks.length +
    user.portfolio.length +
    user.mistakes.length +
    user.reviews.length +
    Object.keys(user.readingPositions ?? {}).length +
    (user.remediationEvents?.length ?? 0)
  );
}
