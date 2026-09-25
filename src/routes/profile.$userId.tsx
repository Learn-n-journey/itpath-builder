import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Clock3, MessageCircle, Settings, UserCheck, UserPlus, Users } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCommunityChat } from "@/hooks/use-community-chat";
import { useSocialMessaging } from "@/hooks/use-social-messaging";
import { useProfile } from "@/hooks/use-profile";
import { useAppState, useStats } from "@/state/app-state";
import { overallMeasures } from "@/lib/mastery-summary";

export const Route=createFileRoute("/profile/$userId")({staticData:{sitemap:false},component:ProfilePage});

function ProfilePage(){
 const {userId:profileId}=Route.useParams(); const nav=useNavigate();
 const {messages}=useCommunityChat("general"); const {friendships,requestFriend,userId}=useSocialMessaging();
 const {profile}=useProfile(profileId);
 const {user}=useAppState(); const stats=useStats(); const measures=overallMeasures(user);
 const posts=useMemo(()=>messages.filter(p=>p.userId===profileId).slice().reverse(),[messages,profileId]);
 const name=profile.displayName||posts[0]?.displayName||profile.firstName||"Learner";
 const isOwn=profileId===userId; const friendCount=friendships.filter(f=>f.status==="accepted").length;
 const friendship=friendships.find(f=>f.requesterId===profileId||f.addresseeId===profileId);
 const accepted=friendship?.status==="accepted",pending=friendship?.status==="pending";
 async function add(){try{await requestFriend(profileId);toast.success("Friend request sent.")}catch{toast.error("Could not send friend request.")}}
 return <div className="-mx-3 -my-3 min-h-[calc(100dvh-4rem)] bg-background sm:-mx-5 sm:-my-5">
  <header className="sticky top-0 z-10 flex h-12 items-center border-b bg-background/95 px-2 backdrop-blur"><button onClick={()=>history.back()} className="rounded-full p-2"><ArrowLeft className="size-5"/></button><span className="ml-1 text-sm font-semibold">Profile</span>{isOwn?<Button asChild variant="ghost" size="sm" className="ml-auto"><Link to="/settings"><Settings className="mr-1.5 size-4"/>Edit</Link></Button>:null}</header>
  <main className="mx-auto max-w-2xl">
   <section className="border-b px-4 py-5"><div className="flex items-center gap-4">{profile.avatarUrl?<img src={profile.avatarUrl} alt="" className="size-20 shrink-0 rounded-full object-cover"/>:<div className="grid size-20 shrink-0 place-items-center rounded-full bg-primary/10 text-2xl font-bold text-primary">{name[0]?.toUpperCase()}</div>}<div className="min-w-0 flex-1"><h1 className="truncate text-xl font-bold">{isOwn?(profile.displayName||profile.firstName||"Your profile"):name}</h1><p className="mt-1 text-sm text-muted-foreground">Learning, building, and connecting on IT PATH.</p></div></div>{isOwn&&<div className="mt-4 flex gap-2"><Button asChild className="flex-1"><Link to="/dashboard"><BookOpen className="mr-2 size-4"/>Continue learning</Link></Button><Button asChild variant="outline"><Link to="/community"><Users className="mr-2 size-4"/>Community</Link></Button></div>}
   {isOwn?<div className="mt-5 grid grid-cols-4 gap-2 border-t pt-4 text-center"><div><p className="font-bold">{stats.studyHours}</p><p className="text-[11px] text-muted-foreground">Hours</p></div><div><p className="font-bold">{stats.topicsCompleted}</p><p className="text-[11px] text-muted-foreground">Completed</p></div><div><p className="font-bold">{stats.labsCompleted}</p><p className="text-[11px] text-muted-foreground">Labs</p></div><div><p className="font-bold">{friendCount}</p><p className="text-[11px] text-muted-foreground">Friends</p></div></div>:null}
   {isOwn?<div className="mt-5 rounded-xl border bg-card p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4 text-primary"/>Your learning</div><Link to="/progress" className="text-xs text-primary hover:underline">View progress</Link></div><div className="mt-3 flex items-end justify-between"><div><p className="text-2xl font-bold">{measures.learningProgress}%</p><p className="text-xs text-muted-foreground">overall learning progress</p></div><p className="text-xs text-muted-foreground">{measures.activitiesCompleted} activities done</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{width: measures.learningProgress + "%"}}/></div></div>:null}
   {profileId!==userId&&<div className="mt-4 flex gap-2">{accepted?<Button className="flex-1" onClick={()=>void nav({to:"/messages",search:{user:profileId}} as any)}><MessageCircle className="mr-2 size-4"/>Message</Button>:<Button className="flex-1" onClick={add} disabled={pending}>{pending?<><UserCheck className="mr-2 size-4"/>Request sent</>:<><UserPlus className="mr-2 size-4"/>Add friend</>}</Button>}<Button variant="outline" size="icon" aria-label="Friends"><Users className="size-4"/></Button></div>}
   </section>
   <section><div className="flex items-center justify-between border-b px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Posts</p>{isOwn?<Link to="/community" className="text-xs font-medium text-primary hover:underline">Create a post</Link>:null}</div>{posts.length?posts.map(p=><article key={p.id} className="border-b px-4 py-4"><p className="whitespace-pre-wrap text-[15px] leading-6">{p.body}</p>{p.imageUrl&&<img src={p.imageUrl} alt="" className="mt-3 max-h-[30rem] w-full rounded-xl object-cover"/>}</article>):<p className="px-4 py-10 text-center text-sm text-muted-foreground">No public posts yet.</p>}</section>
  </main>
 </div>
}
