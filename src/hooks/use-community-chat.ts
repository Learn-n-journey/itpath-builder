import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";

export interface CommunityMessage {
  id: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
}

const LIMIT = 200;

/** Reads one community room, keeps it live, and posts as the signed-in learner. */
export function useCommunityChat(room = "general") {
  const { userId, ready } = useAuth();
  const queryClient = useQueryClient();

  const messages = useQuery({
    queryKey: ["community-messages", room],
    enabled: ready && Boolean(userId),
    queryFn: async (): Promise<CommunityMessage[]> => {
      const { data, error } = await supabase
        .from("community_messages")
        .select("id, user_id, display_name, body, created_at")
        .eq("hidden", false)
        .eq("room", room)
        .order("created_at", { ascending: false })
        .limit(LIMIT);
      if (error) throw error;
      return (data ?? [])
        .map((row) => ({
          id: row.id,
          userId: row.user_id,
          displayName: row.display_name,
          body: row.body,
          createdAt: row.created_at,
        }))
        .reverse();
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`community-room-${room}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_messages", filter: `room=eq.${room}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["community-messages", room] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient, room]);

  const send = useMutation({
    mutationFn: async (input: { body: string; displayName: string }) => {
      if (!userId) throw new Error("Sign in to join the chat.");
      const { error } = await supabase.from("community_messages").insert({
        user_id: userId,
        display_name: input.displayName,
        body: input.body.trim(),
        room,
      });
      if (error) throw new Error(friendly(error.message));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-messages", room] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_messages").delete().eq("id", id);
      if (error) throw new Error(friendly(error.message));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-messages", room] });
    },
  });

  const report = useMutation({
    mutationFn: async (input: { messageId: string; reason?: string }) => {
      if (!userId) throw new Error("Sign in first.");
      const { error } = await supabase.from("community_reports").insert({
        message_id: input.messageId,
        reporter_id: userId,
        reason: input.reason ?? null,
      });
      if (error && !error.message.includes("duplicate key")) throw new Error(friendly(error.message));
    },
  });

  return {
    messages: messages.data ?? [],
    loading: messages.isLoading,
    error: messages.error instanceof Error ? messages.error.message : null,
    send: send.mutateAsync,
    sending: send.isPending,
    remove: remove.mutateAsync,
    report: report.mutateAsync,
  };
}

function friendly(message: string): string {
  const match = /does not allow|posting very quickly/i.exec(message);
  if (match) return message.replace(/^.*?:\s*/, "");
  if (message.includes("community_messages_body_check")) return "Keep the message between 1 and 1000 characters.";
  return "That did not send. Try again in a moment.";
}
