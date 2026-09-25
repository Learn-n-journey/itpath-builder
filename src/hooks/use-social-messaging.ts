import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/state/auth-state";

export type Friendship={id:string;requesterId:string;addresseeId:string;status:"pending"|"accepted"|"declined"|"blocked";createdAt:string};
export type DirectMessage={id:string;friendshipId:string;senderId:string;body:string;createdAt:string;readAt:string|null};

export function useSocialMessaging(){
 const {userId,ready}=useAuth(); const qc=useQueryClient();
 const friendships=useQuery({queryKey:["friendships",userId],enabled:ready&&!!userId,queryFn:async()=>{
  const {data,error}=await supabase.from("friendships").select("id,requester_id,addressee_id,status,created_at").order("updated_at",{ascending:false});
  if(error)throw error; return (data??[]).map(x=>({id:x.id,requesterId:x.requester_id,addresseeId:x.addressee_id,status:x.status,createdAt:x.created_at})) as Friendship[];
 }});
 useEffect(()=>{if(!userId)return;const ch=supabase.channel("social-messaging").on("postgres_changes",{event:"*",schema:"public",table:"friendships"},()=>void qc.invalidateQueries({queryKey:["friendships"]})).on("postgres_changes",{event:"*",schema:"public",table:"direct_messages"},()=>void qc.invalidateQueries({queryKey:["direct-messages"]})).subscribe();return()=>{void supabase.removeChannel(ch)}},[userId,qc]);
 async function requestFriend(addresseeId:string){if(!userId)throw new Error("Sign in first.");const {error}=await supabase.from("friendships").insert({requester_id:userId,addressee_id:addresseeId});if(error)throw error;await qc.invalidateQueries({queryKey:["friendships"]});}
 async function setStatus(id:string,status:Friendship["status"]){const {error}=await supabase.from("friendships").update({status,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;await qc.invalidateQueries({queryKey:["friendships"]});}
 return {friendships:friendships.data??[],loading:friendships.isLoading,requestFriend,setStatus,userId};
}

export type CommunityNotification = { id:string; kind:"message"|"friend-request"; userId:string; displayName:string; preview:string; createdAt:string };

export function useCommunityNotifications(limit=5){
 const {userId,ready}=useAuth(); const qc=useQueryClient();
 const query=useQuery({queryKey:["community-notifications",userId,limit],enabled:ready&&!!userId,queryFn:async()=>{
  const [{data:messages,error:messageError},{data:requests,error:requestError}]=await Promise.all([
   supabase.from("direct_messages").select("id,sender_id,body,created_at").neq("sender_id",userId!).is("read_at",null).order("created_at",{ascending:false}).limit(limit),
   supabase.from("friendships").select("id,requester_id,created_at").eq("addressee_id",userId!).eq("status","pending").order("created_at",{ascending:false}).limit(limit),
  ]);
  if(messageError)throw messageError;if(requestError)throw requestError;
  const ids=[...new Set([...(messages??[]).map(x=>x.sender_id),...(requests??[]).map(x=>x.requester_id)])];
  const names=new Map<string,string>();
  if(ids.length){const {data:profiles}=await supabase.rpc("get_public_profiles",{_ids:ids});for(const p of profiles??[])names.set(p.user_id,p.display_name?.trim()||p.first_name?.trim()||"Learner");}
  const rows:CommunityNotification[]=[
   ...(messages??[]).map(x=>({id:x.id,kind:"message" as const,userId:x.sender_id,displayName:names.get(x.sender_id)??"Learner",preview:x.body,createdAt:x.created_at})),
   ...(requests??[]).map(x=>({id:x.id,kind:"friend-request" as const,userId:x.requester_id,displayName:names.get(x.requester_id)??"Learner",preview:"Sent you a friend request",createdAt:x.created_at})),
  ];
  return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,limit);
 }});
 useEffect(()=>{if(!userId)return;const ch=supabase.channel("community-notifications-"+userId).on("postgres_changes",{event:"*",schema:"public",table:"direct_messages"},()=>void qc.invalidateQueries({queryKey:["community-notifications"]})).on("postgres_changes",{event:"*",schema:"public",table:"friendships"},()=>void qc.invalidateQueries({queryKey:["community-notifications"]})).subscribe();return()=>{void supabase.removeChannel(ch)}},[userId,qc]);
 return {notifications:query.data??[],unreadCount:query.data?.length??0,loading:query.isLoading};
}

export function useDirectMessages(friendshipId:string|null){
 const {userId}=useAuth(); const qc=useQueryClient();
 const query=useQuery({queryKey:["direct-messages",friendshipId],enabled:!!userId&&!!friendshipId,queryFn:async()=>{
  const {data,error}=await supabase.from("direct_messages").select("id,friendship_id,sender_id,body,created_at,read_at").eq("friendship_id",friendshipId!).order("created_at",{ascending:true}).limit(300);if(error)throw error;
  return (data??[]).map(x=>({id:x.id,friendshipId:x.friendship_id,senderId:x.sender_id,body:x.body,createdAt:x.created_at,readAt:x.read_at})) as DirectMessage[];
 }});
 useEffect(()=>{if(!friendshipId)return;const ch=supabase.channel("dm-"+friendshipId).on("postgres_changes",{event:"INSERT",schema:"public",table:"direct_messages",filter:"friendship_id=eq."+friendshipId},()=>void qc.invalidateQueries({queryKey:["direct-messages",friendshipId]})).subscribe();return()=>{void supabase.removeChannel(ch)}},[friendshipId,qc]);
 async function send(body:string){if(!userId||!friendshipId||!body.trim())return;const {error}=await supabase.from("direct_messages").insert({friendship_id:friendshipId,sender_id:userId,body:body.trim()});if(error)throw error;await qc.invalidateQueries({queryKey:["direct-messages",friendshipId]});}
 async function markRead(){if(!userId||!friendshipId)return;const {error}=await supabase.from("direct_messages").update({read_at:new Date().toISOString()}).eq("friendship_id",friendshipId).neq("sender_id",userId).is("read_at",null);if(error)throw error;await Promise.all([qc.invalidateQueries({queryKey:["direct-messages",friendshipId]}),qc.invalidateQueries({queryKey:["community-notifications"]})]);}
 return {messages:query.data??[],loading:query.isLoading,send,markRead};
}
