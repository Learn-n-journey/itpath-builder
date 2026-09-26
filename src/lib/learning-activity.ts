import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { LearningActivityType, LearningActivityVisibility } from "@/hooks/use-learning-activity";

export interface LearningActivityEvent {
  activityType: LearningActivityType;
  eventKey: string;
  title: string;
  description?: string;
  entityId?: string;
  metadata?: Json;
  visibility?: LearningActivityVisibility;
  occurredAt?: string;
}

/**
 * Records one milestone at most once for a learner.
 * The database's (user_id, event_key) unique index is the final authority,
 * so retries, multiple tabs and sync races cannot duplicate the activity.
 */
export async function recordLearningActivity(userId: string, event: LearningActivityEvent): Promise<void> {
  const row = {
    user_id: userId,
    activity_type: event.activityType,
    event_key: event.eventKey,
    title: event.title,
    description: event.description ?? null,
    entity_id: event.entityId ?? null,
    metadata: event.metadata ?? {},
    visibility: event.visibility ?? "private",
    occurred_at: event.occurredAt ?? new Date().toISOString(),
  };
  const { error } = await supabase
    .from("learning_activities")
    .upsert(row, { onConflict: "user_id,event_key", ignoreDuplicates: true });
  if (error) throw error;
}
