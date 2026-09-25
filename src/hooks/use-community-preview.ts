import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";

export interface CommunityPreviewPost {
  id:string; userId:string; displayName:string; body:string; createdAt:string; room:string; imageUrl:string|null; likeCount:number; commentCount:number;
}

export function useCommunityPreview(limit=4){
  const {userId,ready}=useAuth();
  const queryClient=useQueryClient();
  const query=useQuery({
    queryKey:["dashboard-community-preview",limit],
    enabled:ready&&Boolean(userId),
    queryFn:async():Promise<CommunityPreviewPost[]>=>{
      let {data,error}=await supabase.from("community_messages").select("id,user_id,display_name,body,created_at,room,image_url").eq("hidden",false).order("created_at",{ascending:false}).limit(limit);
      if(error&&/image_url|column/i.test(error.message)){
        const fallback=await supabase.from("community_messages").select("id,user_id,display_name,body,created_at,room").eq("hidden",false).order("created_at",{ascending:false}).limit(limit);
        data=fallback.data?.map(row=>({...row,image_url:null}))??null; error=fallback.error;
      }
      if(error)throw error;
      const paths=(data??[]).map(row=>row.image_url).filter((u):u is string=>Boolean(u)&&!u!.startsWith("http"));
      const signed=new Map<string,string>();
      if(paths.length){
        const {data:signedRows}=await supabase.storage.from("community-images").createSignedUrls(paths,3600);
        for(const s of signedRows??[])if(s.signedUrl&&s.path)signed.set(s.path,s.signedUrl);
      }
      const rows=(data??[]).map(row=>({...row,image_url:row.image_url?(signed.get(row.image_url)??row.image_url):null}));
      const ids=rows.map(row=>row.id);
      const [{data:likes},{data:comments}]=ids.length?await Promise.all([
        supabase.from("community_likes").select("message_id").in("message_id",ids),
        supabase.from("community_comments").select("message_id").in("message_id",ids),
      ]):[{data:[]},{data:[]}];
      const lc=new Map<string,number>(),cc=new Map<string,number>();
      for(const x of likes??[])lc.set(x.message_id,(lc.get(x.message_id)??0)+1);
      for(const x of comments??[])cc.set(x.message_id,(cc.get(x.message_id)??0)+1);
      return (data??[]).map(row=>({id:row.id,userId:row.user_id,displayName:row.display_name,body:row.body,createdAt:row.created_at,room:row.room,imageUrl:row.image_url??null,likeCount:lc.get(row.id)??0,commentCount:cc.get(row.id)??0}));
    }
  });
  useEffect(()=>{if(!userId)return;const channel=supabase.channel("dashboard-community").on("postgres_changes",{event:"*",schema:"public",table:"community_messages"},()=>void queryClient.invalidateQueries({queryKey:["dashboard-community-preview"]})).subscribe();return()=>{void supabase.removeChannel(channel)}},[userId,queryClient]);
  return {posts:query.data??[],loading:query.isLoading};
}
