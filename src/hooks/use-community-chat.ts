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
  imageUrl: string | null;
  likeCount: number;
  liked: boolean;
  saved: boolean;
  commentCount: number;
}

export interface CommunityComment { id:string; messageId:string; userId:string; displayName:string; body:string; createdAt:string; }

const LIMIT = 200;

/** Reads one community room, keeps it live, and posts as the signed-in learner. */
export function useCommunityChat(room = "general") {
  const { userId, ready } = useAuth();
  const queryClient = useQueryClient();

  const messages = useQuery({
    queryKey: ["community-messages", room],
    enabled: ready && Boolean(userId),
    queryFn: async (): Promise<CommunityMessage[]> => {
      let { data, error } = await supabase
        .from("community_messages")
        .select("id, user_id, display_name, body, created_at, image_url")
        .eq("hidden", false)
        .eq("room", room)
        .order("created_at", { ascending: false })
        .limit(LIMIT);
      // Keep Community usable while a new migration is still rolling out.
      if (error && /image_url|column/i.test(error.message)) {
        const fallback = await supabase
          .from("community_messages")
          .select("id, user_id, display_name, body, created_at")
          .eq("hidden", false)
          .eq("room", room)
          .order("created_at", { ascending: false })
          .limit(LIMIT);
        data = fallback.data?.map(row => ({ ...row, image_url: null })) ?? null;
        error = fallback.error;
      }
      if (error) throw error;
      // Private bucket: swap stored paths for short-lived signed viewing links.
      const paths=(data??[]).map(row=>row.image_url).filter((u):u is string=>Boolean(u)&&!u!.startsWith("http"));
      const signed=new Map<string,string>();
      if(paths.length){
        const {data:signedRows}=await supabase.storage.from("community-images").createSignedUrls(paths,3600);
        for(const s of signedRows??[])if(s.signedUrl&&s.path)signed.set(s.path,s.signedUrl);
      }
      const rows=(data??[]).map(row=>({...row,image_url:row.image_url?(signed.get(row.image_url)??row.image_url):null}));
      const ids=rows.map(row=>row.id);
      const [{data:likes},{data:comments},{data:saves}]=ids.length ? await Promise.all([
        supabase.from("community_likes").select("message_id,user_id").in("message_id",ids),
        supabase.from("community_comments").select("message_id").in("message_id",ids),
        supabase.from("community_saves").select("message_id,user_id").eq("user_id",userId!).in("message_id",ids),
      ]) : [{data:[]},{data:[]},{data:[]}];
      const likeCounts=new Map<string,number>(),commentCounts=new Map<string,number>();
      for(const item of likes??[])likeCounts.set(item.message_id,(likeCounts.get(item.message_id)??0)+1);
      for(const item of comments??[])commentCounts.set(item.message_id,(commentCounts.get(item.message_id)??0)+1);
      const liked=new Set((likes??[]).filter(item=>item.user_id===userId).map(item=>item.message_id));
      const saved=new Set((saves??[]).map(item=>item.message_id));
      return rows
        .map((row) => ({
          id: row.id,
          userId: row.user_id,
          displayName: row.display_name,
          body: row.body,
          createdAt: row.created_at,
          imageUrl: row.image_url ?? null,
          likeCount: likeCounts.get(row.id)??0,
          liked: liked.has(row.id),
          saved: saved.has(row.id),
          commentCount: commentCounts.get(row.id)??0,
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
    mutationFn: async (input: { body: string; displayName: string; image?: File | null }) => {
      if (!userId) throw new Error("Sign in to join the chat.");
      let imageUrl: string | null = null;
      if(input.image){
        if(input.image.size>8*1024*1024)throw new Error("Keep images under 8 MB.");
        if(!["image/jpeg","image/png","image/webp","image/gif"].includes(input.image.type))throw new Error("Use a JPG, PNG, WebP, or GIF image.");
        const ext=(input.image.name.split(".").pop()||"jpg").toLowerCase();
        const key=`${userId}/${crypto.randomUUID()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from("community-images").upload(key,input.image,{contentType:input.image.type,upsert:false});
        if(uploadError)throw new Error("That image did not upload. Try again.");
        imageUrl=key; // private bucket: store the path, sign it when reading
      }
      const post = { user_id: userId, display_name: input.displayName, body: input.body.trim(), room };
      let { error } = imageUrl
        ? await supabase.from("community_messages").insert({ ...post, image_url: imageUrl })
        : await supabase.from("community_messages").insert(post);
      // Text posts must continue to work even before the image column migration lands.
      if (error && !imageUrl && /image_url|column/i.test(error.message)) {
        ({ error } = await supabase.from("community_messages").insert(post));
      }
      if (error) throw new Error(friendly(error.message));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["community-messages", room] });
    },
  });

  const edit = useMutation({
    mutationFn: async (input: { id: string; body: string }) => {
      if (!userId) throw new Error("Sign in first.");
      const body = input.body.trim();
      if (!body) throw new Error("A post cannot be empty.");
      const { error } = await supabase.from("community_messages").update({ body }).eq("id", input.id).eq("user_id", userId);
      if (error) throw new Error(friendly(error.message));
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["community-messages", room] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Sign in first.");
      const { error } = await supabase.from("community_messages").delete().eq("id", id).eq("user_id", userId);
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


  const toggleLike = async (message: CommunityMessage) => {
    if(!userId)throw new Error("Sign in first.");
    const query=supabase.from("community_likes");
    const {error}=message.liked ? await query.delete().eq("message_id",message.id).eq("user_id",userId) : await query.insert({message_id:message.id,user_id:userId});
    if(error)throw new Error(friendly(error.message));
    await queryClient.invalidateQueries({queryKey:["community-messages",room]});
  };

  const toggleSave = async (message: CommunityMessage) => {
    if(!userId)throw new Error("Sign in first.");
    const query=supabase.from("community_saves");
    const {error}=message.saved ? await query.delete().eq("message_id",message.id).eq("user_id",userId) : await query.insert({message_id:message.id,user_id:userId});
    if(error)throw new Error(friendly(error.message));
    await queryClient.invalidateQueries({queryKey:["community-messages",room]});
  };

  const getComments = async (messageId:string):Promise<CommunityComment[]> => {
    const {data,error}=await supabase.from("community_comments").select("id,message_id,user_id,display_name,body,created_at").eq("message_id",messageId).order("created_at",{ascending:true});
    if(error)throw new Error(friendly(error.message));
    return (data??[]).map(row=>({id:row.id,messageId:row.message_id,userId:row.user_id,displayName:row.display_name,body:row.body,createdAt:row.created_at}));
  };

  const addComment = async (messageId:string, body:string, displayName:string) => {
    if(!userId)throw new Error("Sign in first.");
    const {error}=await supabase.from("community_comments").insert({message_id:messageId,user_id:userId,display_name:displayName,body:body.trim()});
    if(error)throw new Error(friendly(error.message));
    await queryClient.invalidateQueries({queryKey:["community-messages",room]});
  };

  return {
    messages: messages.data ?? [],
    loading: messages.isLoading,
    error: messages.error instanceof Error ? messages.error.message : null,
    send: send.mutateAsync,
    sending: send.isPending,
    edit: edit.mutateAsync,
    editing: edit.isPending,
    remove: remove.mutateAsync,
    report: report.mutateAsync,
    toggleLike, toggleSave, getComments, addComment,
  };
}

function friendly(message: string): string {
  const match = /does not allow|posting very quickly/i.exec(message);
  if (match) return message.replace(/^.*?:\s*/, "");
  if (message.includes("community_messages_body_check")) return "Keep the message between 1 and 1000 characters.";
  return "That did not send. Try again in a moment.";
}
