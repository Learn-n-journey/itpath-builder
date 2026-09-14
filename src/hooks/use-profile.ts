import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";

/** Reads and updates the signed-in learner's first name. */
export function useProfile() {
  const { userId, ready } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["profile", userId],
    enabled: ready && Boolean(userId),
    queryFn: async (): Promise<{ firstName: string }> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return { firstName: data?.first_name?.trim() ?? "" };
    },
  });

  const save = useMutation({
    mutationFn: async (firstName: string) => {
      if (!userId) throw new Error("You need to be signed in.");
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, first_name: firstName.trim() || null }, { onConflict: "user_id" });
      if (error) throw error;
      return firstName.trim();
    },
    onSuccess: (firstName) => {
      queryClient.setQueryData(["profile", userId], { firstName });
    },
  });

  return {
    firstName: query.data?.firstName ?? "",
    loading: !ready || (Boolean(userId) && query.isLoading),
    saveFirstName: save.mutateAsync,
    saving: save.isPending,
  };
}
