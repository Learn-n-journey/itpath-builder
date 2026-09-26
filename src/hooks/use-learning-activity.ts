import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/state/auth-state";

export type LearningActivityType =
  | "lesson_completed"
  | "mastery_advanced"
  | "lab_completed"
  | "achievement_earned"
  | "project_completed"
  | "certification_milestone"
  | "streak_milestone"
  | "game_accomplishment";

export type LearningActivityVisibility = "private" | "friends" | "community" | "public";

export interface LearningActivity {
  id: string;
  userId: string;
  activityType: LearningActivityType;
  title: string;
  description: string | null;
  entityId: string | null;
  eventKey: string | null;
  metadata: Json;
  visibility: LearningActivityVisibility;
  isFeatured: boolean;
  occurredAt: string;
}

export function useLearningActivity(profileId?: string) {
  const { userId, ready } = useAuth();
  const id = profileId ?? userId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["learning-activity", id],
    enabled: ready && Boolean(id),
    queryFn: async (): Promise<LearningActivity[]> => {
      const { data, error } = await supabase
        .from("learning_activities")
        .select("id,user_id,activity_type,title,description,entity_id,event_key,metadata,visibility,is_featured,occurred_at")
        .eq("user_id", id!)
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        activityType: row.activity_type as LearningActivityType,
        title: row.title,
        description: row.description,
        entityId: row.entity_id,
        eventKey: row.event_key,
        metadata: row.metadata,
        visibility: row.visibility as LearningActivityVisibility,
        isFeatured: row.is_featured,
        occurredAt: row.occurred_at,
      }));
    },
  });

  const updateSharing = useMutation({
    mutationFn: async (input: { id: string; visibility?: LearningActivityVisibility; isFeatured?: boolean }) => {
      if (!userId || id !== userId) throw new Error("You can only change your own activity.");
      const changes: { visibility?: LearningActivityVisibility; is_featured?: boolean } = {};
      if (input.visibility) changes.visibility = input.visibility;
      if (typeof input.isFeatured === "boolean") changes.is_featured = input.isFeatured;
      const { error } = await supabase
        .from("learning_activities")
        .update(changes)
        .eq("id", input.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["learning-activity", id] }),
  });

  return {
    activities: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    updateSharing: updateSharing.mutateAsync,
    updatingSharing: updateSharing.isPending,
    isOwn: Boolean(userId && id === userId),
  };
}
