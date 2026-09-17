import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";

/** The public name a learner shows next to their community messages. */
export function useDisplayName() {
  const { userId, ready } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["display-name", userId],
    enabled: ready && Boolean(userId),
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data?.display_name?.trim() ?? "";
    },
  });

  const save = useMutation({
    mutationFn: async (name: string) => {
      if (!userId) throw new Error("Sign in first.");
      const clean = name.trim();
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, display_name: clean }, { onConflict: "user_id" });
      if (error) {
        throw new Error(
          error.message.includes("profiles_display_name_unique")
            ? "Someone already uses that name. Try another."
            : "That name did not save. Try again.",
        );
      }
      return clean;
    },
    onSuccess: (clean) => {
      queryClient.setQueryData(["display-name", userId], clean);
    },
  });

  return {
    displayName: query.data ?? "",
    loading: !ready || (Boolean(userId) && query.isLoading),
    saveDisplayName: save.mutateAsync,
    saving: save.isPending,
  };
}
