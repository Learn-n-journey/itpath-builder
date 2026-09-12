import { supabase } from "@/integrations/supabase/client";
import { sanitizeUser } from "@/lib/app-data/storage";
import { APP_DATA_VERSION, type UserData } from "@/lib/app-data/types";

export interface CloudFetchResult {
  ok: boolean;
  found: boolean;
  user: UserData | null;
  error?: string;
}

/** Reads the signed-in learner's saved progress from their account. */
export async function fetchCloudState(userId: string): Promise<CloudFetchResult> {
  const { data, error } = await supabase
    .from("user_state")
    .select("data, version")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return { ok: false, found: false, user: null, error: error.message };
  if (!data) return { ok: true, found: false, user: null };

  const payload = data.data as { user?: unknown } | null;
  return { ok: true, found: true, user: sanitizeUser(payload?.user) };
}

/** Writes the learner's progress to their account, replacing the stored copy. */
export async function pushCloudState(
  userId: string,
  user: UserData,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("user_state").upsert(
    {
      user_id: userId,
      version: APP_DATA_VERSION,
      data: { user } as unknown as never,
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
    user.assignmentAttempts.length +
    user.labAttempts.length +
    user.ticketAttempts.length +
    user.incidentAttempts.length +
    user.recallResponses.length +
    user.practiceResponses.length +
    user.studySessions.length +
    user.notes.length +
    user.bookmarks.length +
    user.portfolio.length +
    user.mistakes.length +
    user.reviews.length
  );
}
