import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";

export function useProfile(profileId?: string) {
  const { userId, ready } = useAuth();
  const id = profileId ?? userId;
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["profile", id],
    enabled: ready && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,first_name,display_name,avatar_url")
        .eq("user_id", id!)
        .maybeSingle();

      if (error) throw error;

      let avatarUrl: string | null = null;
      const raw = data?.avatar_url ?? null;

      if (raw) {
        // Legacy public profile-image URLs point at a private bucket.
        // Extract their object key so we can sign them instead.
        const match = raw.match(/\/storage\/v1\/object\/public\/profile-images\/(.+)$/);
        const key = match ? match[1] : raw;

        if (/^https?:\/\//i.test(key)) {
          // Keep genuine external avatars (Google OAuth, Gravatar, etc.) as-is.
          avatarUrl = key;
        } else {
          const { data: signed, error: signedError } = await supabase.storage
            .from("profile-images")
            .createSignedUrl(key, 3600);

          if (signedError) throw signedError;
          avatarUrl = signed?.signedUrl ?? null;
        }
      }

      return {
        userId: id!,
        firstName: data?.first_name?.trim() ?? "",
        displayName: data?.display_name?.trim() ?? "",
        avatarUrl,
      };
    },
  });

  const save = useMutation({
    mutationFn: async (firstName: string) => {
      if (!userId || id !== userId) throw new Error("You can only edit your own profile.");
      const { error } = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, first_name: firstName.trim() || null },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      return firstName.trim();
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["profile", id] }),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!userId || id !== userId) throw new Error("You can only edit your own profile.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Keep profile pictures under 5 MB.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new Error("Use a JPG, PNG, or WebP image.");
      }

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const key = `${userId}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(key, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      // The bucket is private, so persist the object key rather than a public URL.
      const { error: dbError } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, avatar_url: key }, { onConflict: "user_id" });
      if (dbError) throw dbError;

      return key;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["profile", id] });
      await qc.refetchQueries({ queryKey: ["profile", id] });
    },
  });

  const p = q.data ?? {
    userId: id ?? "",
    firstName: "",
    displayName: "",
    avatarUrl: null,
  };

  return {
    profile: p,
    firstName: p.firstName,
    loading: !ready || (!!id && q.isLoading),
    saveFirstName: save.mutateAsync,
    saving: save.isPending,
    uploadAvatar: upload.mutateAsync,
    uploading: upload.isPending,
    isOwn: !!userId && id === userId,
  };
}


export function useProfiles(profileIds: string[]) {
  const ids = [...new Set(profileIds.filter(Boolean))].sort();
  const q = useQuery({
    queryKey: ["profiles", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id,first_name,display_name,avatar_url")
        .in("user_id", ids);
      if (error) throw error;
      const result: Record<string, { displayName: string; avatarUrl: string | null }> = {};
      await Promise.all((data ?? []).map(async (row) => {
        const raw = row.avatar_url ?? null;
        let avatarUrl: string | null = null;
        if (raw) {
          const match = raw.match(/\/storage\/v1\/object\/public\/profile-images\/(.+)$/);
          const key = match ? match[1] : raw;
          if (/^https?:\/\//i.test(key)) avatarUrl = key;
          else {
            const { data: signed } = await supabase.storage.from("profile-images").createSignedUrl(key, 3600);
            avatarUrl = signed?.signedUrl ?? null;
          }
        }
        result[row.user_id] = {
          displayName: row.display_name?.trim() || row.first_name?.trim() || "Learner",
          avatarUrl,
        };
      }));
      return result;
    },
  });
  return { profiles: q.data ?? {}, loading: q.isLoading };
}
