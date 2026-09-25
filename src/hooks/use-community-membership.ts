import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";

export function useCommunityMembership(room: string) {
  const { userId, ready } = useAuth();
  const queryClient = useQueryClient();

  const membership = useQuery({
    queryKey: ["community-membership", userId, room],
    enabled: ready && Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_memberships")
        .select("room")
        .eq("user_id", userId!)
        .eq("room", room)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in first.");
      if (membership.data) {
        const { error } = await supabase.from("community_memberships").delete().eq("user_id", userId).eq("room", room);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase.from("community_memberships").insert({ user_id: userId, room });
      if (error) throw error;
      return true;
    },
    onSuccess: (joined) => {
      queryClient.setQueryData(["community-membership", userId, room], joined);
      void queryClient.invalidateQueries({ queryKey: ["community-memberships", userId] });
    },
  });

  return { joined: membership.data ?? false, loading: membership.isLoading, toggle: toggle.mutateAsync, changing: toggle.isPending };
}

export function useMyCommunityMemberships() {
  const { userId, ready } = useAuth();
  const query = useQuery({
    queryKey: ["community-memberships", userId],
    enabled: ready && Boolean(userId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from("community_memberships").select("room").eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []).map((row) => row.room);
    },
  });
  return { rooms: query.data ?? [], loading: query.isLoading };
}
