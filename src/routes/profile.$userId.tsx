import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle, UserCheck, UserPlus, Users } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCommunityChat } from "@/hooks/use-community-chat";
import { useSocialMessaging } from "@/hooks/use-social-messaging";

export const Route=createFileRoute("/profile/$userId")({staticData:{sitemap:false},component:ProfilePage});

function ProfilePage(){
 const {userId:profileId}=Route.useParams(); const nav=useNavigate();
 const {messages}=useCommunityChat("general"); const {friendships,requestFriend,userId}=useSocialMessaging();
 const posts=useMemo(()=>messages.filter(p=>p.userId===profileId).slice().reverse(),[messages,profileId]);
 const name=posts[0]?.displayName||"Learner";
 const friendship=friendships.find(f=>f.requesterId===profileId||f.addresseeId===profileId);
 const accepted=friendship?.status==="accepted",pending=friendship?.status==="pending";
 async function add(){try{await requestFriend(profileId);toast.success("Friend request sent.")}catch{toast.error("Could not send friend request.")}}
 return <div className="-mx-3 -my-3 min-h-[calc(100dvh-4rem)] bg-background sm:-mx-5 sm:-my-5">
  <header className="sticky top-0 z-10 flex h-12 items-center border-b bg-background/95 px-2 backdrop-blur"><button onClick={()=>history.back()} className="rounded-full p-2"><ArrowLeft className="size-5"/></button><span className="ml-1 text-sm font-semibold">Profile</span></header>
  <main className="mx-auto max-w-2xl">
   <section className="border-b px-4 py-5"><div className="flex items-center gap-4"><div className="grid size-20 shrink-0 place-items-center rounded-full bg-primary/10 text-2xl font-bold text-primary">{name[0]?.toUpperCase()}</div><div className="min-w-0 flex-1"><h1 className="truncate text-xl font-bold">{profileId===userId?"You":name}</h1><p className="mt-1 text-sm text-muted-foreground">IT PATH learner</p></div></div>
   {profileId!==userId&&<div className="mt-4 flex gap-2">{accepted?<Button className="flex-1" onClick={()=>void nav({to:"/messages",search:{user:profileId}} as any)}><MessageCircle className="mr-2 size-4"/>Message</Button>:<Button className="flex-1" onClick={add} disabled={pending}>{pending?<><UserCheck className="mr-2 size-4"/>Request sent</>:<><UserPlus className="mr-2 size-4"/>Add friend</>}</Button>}<Button variant="outline" size="icon" aria-label="Friends"><Users className="size-4"/></Button></div>}
   </section>
   <section><p className="border-b px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Posts</p>{posts.length?posts.map(p=><article key={p.id} className="border-b px-4 py-4"><p className="whitespace-pre-wrap text-[15px] leading-6">{p.body}</p>{p.imageUrl&&<img src={p.imageUrl} alt="" className="mt-3 max-h-[30rem] w-full rounded-xl object-cover"/>}</article>):<p className="px-4 py-10 text-center text-sm text-muted-foreground">No public posts yet.</p>}</section>
  </main>
 </div>
}
