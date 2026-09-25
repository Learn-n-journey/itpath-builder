import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, MessageCircle, Send, UserPlus, Users, X } from "lucide-react";
import { useMemo,useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCommunityChat } from "@/hooks/use-community-chat";
import { useDirectMessages,useSocialMessaging } from "@/hooks/use-social-messaging";
import { useDisplayName } from "@/hooks/use-display-name";
import { cn } from "@/lib/utils";

export const Route=createFileRoute("/messages")({staticData:{sitemap:false},component:MessagesPage});

function MessagesPage(){
 const {friendships,setStatus,requestFriend,userId}=useSocialMessaging();
 const {messages:community}=useCommunityChat("general");
 const {displayName}=useDisplayName();
 const [active,setActive]=useState<string|null>(null),[draft,setDraft]=useState("");
 const dm=useDirectMessages(active);
 const names=useMemo(()=>{const m=new Map<string,string>();for(const p of community)m.set(p.userId,p.displayName);return m},[community]);
 const accepted=friendships.filter(f=>f.status==="accepted"), incoming=friendships.filter(f=>f.status==="pending"&&f.addresseeId===userId);
 const candidates=useMemo(()=>{const existing=new Set(friendships.flatMap(f=>[f.requesterId,f.addresseeId]));return [...new Map(community.filter(p=>p.userId!==userId&&!existing.has(p.userId)).map(p=>[p.userId,p.displayName])).entries()].slice(0,20)},[community,friendships,userId]);
 const selected=accepted.find(f=>f.id===active); const other=selected?(selected.requesterId===userId?selected.addresseeId:selected.requesterId):null;
 async function send(e:React.FormEvent){e.preventDefault();try{await dm.send(draft);setDraft("")}catch{toast.error("Message did not send.")}}
 if(active&&selected)return <div className="fixed inset-0 z-40 flex flex-col bg-background md:static md:h-[calc(100dvh-5rem)]">
   <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3"><button onClick={()=>setActive(null)} className="rounded-full p-2 hover:bg-secondary"><ArrowLeft className="size-5"/></button><div className="grid size-9 place-items-center rounded-full bg-primary/10 font-bold text-primary">{(names.get(other!)||"F")[0]}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{names.get(other!)||"Friend"}</p><p className="text-[11px] text-muted-foreground">Private conversation</p></div></header>
   <main className="flex-1 overflow-y-auto px-3 py-4"><div className="mx-auto flex max-w-2xl flex-col gap-2">{dm.messages.map(m=><div key={m.id} className={cn("max-w-[82%] rounded-2xl px-3 py-2 text-sm",m.senderId===userId?"ml-auto rounded-br-md bg-primary text-primary-foreground":"mr-auto rounded-bl-md bg-secondary")}>{m.body}</div>)}</div></main>
   <form onSubmit={send} className="shrink-0 border-t bg-background p-2 pb-[max(.5rem,env(safe-area-inset-bottom))]"><div className="mx-auto flex max-w-2xl gap-2"><Input autoFocus value={draft} onChange={e=>setDraft(e.target.value)} maxLength={2000} placeholder="Message…"/><Button size="icon" disabled={!draft.trim()}><Send className="size-4"/></Button></div></form>
 </div>;
 return <div className="-mx-3 -my-3 min-h-[calc(100dvh-4rem)] bg-background sm:-mx-5 sm:-my-5"><header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur"><div><h1 className="font-display text-xl font-semibold">Messages</h1><p className="text-[11px] text-muted-foreground">Friends & private conversations</p></div><Link to="/community" className="rounded-full p-2 hover:bg-secondary"><Users className="size-5"/></Link></header>
 <main className="mx-auto max-w-2xl pb-6">
  {incoming.length>0&&<section className="border-b px-4 py-3"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Requests</p>{incoming.map(f=><div key={f.id} className="flex items-center gap-3 py-2"><div className="grid size-10 place-items-center rounded-full bg-secondary font-bold">{(names.get(f.requesterId)||"?")[0]}</div><p className="flex-1 text-sm font-semibold">{names.get(f.requesterId)||"Learner"}</p><button onClick={()=>void setStatus(f.id,"accepted")} className="rounded-full bg-primary p-2 text-primary-foreground"><Check className="size-4"/></button><button onClick={()=>void setStatus(f.id,"declined")} className="rounded-full bg-secondary p-2"><X className="size-4"/></button></div>)}</section>}
  <section>{accepted.length?<>{accepted.map(f=>{const id=f.requesterId===userId?f.addresseeId:f.requesterId;return <button key={f.id} onClick={()=>setActive(f.id)} className="flex w-full items-center gap-3 border-b px-4 py-3 text-left hover:bg-secondary/40"><div className="grid size-12 place-items-center rounded-full bg-primary/10 font-bold text-primary">{(names.get(id)||"F")[0]}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{names.get(id)||"Friend"}</p><p className="text-xs text-muted-foreground">Tap to message</p></div><MessageCircle className="size-5 text-muted-foreground"/></button>})}</>:<div className="px-6 py-10 text-center"><Users className="mx-auto size-8 text-muted-foreground"/><p className="mt-3 font-semibold">Your friends will appear here</p><p className="mt-1 text-sm text-muted-foreground">Connect with learners from Community, then message privately.</p></div>}</section>
  {candidates.length>0&&<section className="border-t px-4 py-4"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">People from Community</p>{candidates.map(([id,name])=><div key={id} className="flex items-center gap-3 py-2"><div className="grid size-10 place-items-center rounded-full bg-secondary font-bold">{name[0]}</div><p className="flex-1 text-sm font-semibold">{name}</p><button onClick={async()=>{try{await requestFriend(id);toast.success("Friend request sent.")}catch{toast.error("Could not send request.")}}} className="rounded-full p-2 text-primary hover:bg-primary/10"><UserPlus className="size-5"/></button></div>)}</section>}
 </main></div>
}
