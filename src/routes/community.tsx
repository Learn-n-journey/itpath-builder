import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  Bookmark,
  BookOpen,
  BriefcaseBusiness,
  CircleHelp,
  Cloud,
  Code2,
  GraduationCap,
  Network,
  Rocket,
  Shield,
  Wrench,
  Heart,
  Home,
  ImagePlus,
  MessageCircle,
  MoreHorizontal,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
  Flag,
  Hash,
  MessagesSquare,
  Pencil,
  Send,
  ShieldCheck,
  Trash2,
  Terminal,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/state/auth-state";
import { useAppState } from "@/state/app-state";
import { useCommunityChat, type CommunityPostType } from "@/hooks/use-community-chat";
import { useCommunityMembership } from "@/hooks/use-community-membership";
import { useDisplayName } from "@/hooks/use-display-name";
import { useProfile, useProfiles } from "@/hooks/use-profile";
import { checkDisplayName, checkMessage } from "@/lib/community/word-filter";
import { COMMUNITY_ROOMS, GENERAL_ROOM, isValidRoom, roomTitle } from "@/lib/community/rooms";
import { cn } from "@/lib/utils";

// Community workspace: responsive room navigation, conversation feed, and study context.

export const Route = createFileRoute("/community")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { room?: string | undefined } => ({
    room: typeof search["room"] === "string" ? search["room"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Community and study rooms | IT PATH" },
      { name: "description", content: "Talk with other IT PATH learners in general chat or topic study rooms." },
      { property: "og:title", content: "Community and study rooms | IT PATH" },
      { property: "og:description", content: "General chat plus a study room for every section of the curriculum." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommunityPage,
});

function timeLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        " " +
        date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function CommunityPage() {
  const { userId, ready } = useAuth();
  const { user } = useAppState();
  const navigate = useNavigate({ from: "/community" });
  const search = Route.useSearch();
  const room = search.room && isValidRoom(search.room) ? search.room : GENERAL_ROOM;
  const { displayName, loading: nameLoading, saveDisplayName, saving } = useDisplayName();
  const { profile: ownProfile } = useProfile();
  const { messages, loading, send, sending, edit, editing, remove, report, toggleLike, toggleSave, getComments, addComment } = useCommunityChat(room);
  const membership = useCommunityMembership(room);
  const { profiles: communityProfiles } = useProfiles(messages.map(message => message.userId));
  const [openComments,setOpenComments]=useState<string|null>(null);
  const [comments,setComments]=useState<any[]>([]);
  const [commentDraft,setCommentDraft]=useState("");
  const [feedMode,setFeedMode]=useState<"latest"|"popular">("latest");
  const [draft, setDraft] = useState("");
  const [postType, setPostType] = useState<CommunityPostType>("discussion");
  const [postFilter, setPostFilter] = useState<CommunityPostType | "all">("all");
  const [communityQuery, setCommunityQuery] = useState("");
  const [postImage,setPostImage]=useState<File|null>(null);
  const [postImagePreview,setPostImagePreview]=useState<string|null>(null);
  const imageInputRef=useRef<HTMLInputElement>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingPost,setEditingPost]=useState<string|null>(null);
  const [editDraft,setEditDraft]=useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const rooms = COMMUNITY_ROOMS;

  useEffect(() => setNameDraft(displayName), [displayName]);



  const needsName = ready && Boolean(userId) && !nameLoading && !displayName;
  const title = roomTitle(room);
  const feedMessages=useMemo(()=>feedMode==="popular" ? [...messages].sort((a,b)=>(b.likeCount+b.commentCount*2)-(a.likeCount+a.commentCount*2)) : [...messages].reverse(),[messages,feedMode]);

  if (ready && !userId) {
    return (
      <>
        <CommunityHero />
        <Panel title="Sign in to join" description="The rooms are for people with an IT PATH account.">
          <Button asChild><Link to="/auth">Sign in or create an account</Link></Button>
        </Panel>
      </>
    );
  }

  async function handleName(event: React.FormEvent) {
    event.preventDefault();
    const problem = checkDisplayName(nameDraft);
    if (problem) return void toast.error(problem);
    try {
      await saveDisplayName(nameDraft);
      setEditingName(false);
      toast.success("Name saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not save.");
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    const problem = draft.trim() ? checkMessage(draft) : postImage ? null : "Write something or add an image.";
    if (problem) return void toast.error(problem);
    try {
      await send({ body: draft || " ", displayName, image: postImage, postType });
      setDraft("");
      setPostImage(null); if(postImagePreview)URL.revokeObjectURL(postImagePreview); setPostImagePreview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not send.");
    }
  }

  const typeFilteredFeed = postFilter === "all" ? feedMessages : feedMessages.filter((message) => message.postType === postFilter);
  const filteredFeed = communityQuery.trim()
    ? typeFilteredFeed.filter((message) => message.body.toLowerCase().includes(communityQuery.trim().toLowerCase()) || message.displayName.toLowerCase().includes(communityQuery.trim().toLowerCase()))
    : typeFilteredFeed;
  const postTypes: Array<{value: CommunityPostType; label: string}> = [
    { value: "question", label: "Question" },
    { value: "troubleshooting", label: "Troubleshooting" },
    { value: "discussion", label: "Discussion" },
    { value: "progress", label: "Progress" },
    { value: "project", label: "Project" },
    { value: "study-help", label: "Study Help" },
  ];
  const popularTopics = [
    { label: "New to IT", room: "new-to-it", icon: CircleHelp },
    { label: "Career Changers", room: "career-changers", icon: BriefcaseBusiness },
    { label: "Home Lab Builders", room: "home-lab-builders", icon: Wrench },
    { label: "Certification Study", room: "certification-study", icon: GraduationCap },
    { label: "Networking Crew", room: "networking-crew", icon: Network },
    { label: "Cybersecurity", room: "cybersecurity", icon: Shield },
    { label: "Build & Show", room: "build-show", icon: Rocket },
    { label: "Troubleshooting Help", room: "troubleshooting-help", icon: Terminal },
  ];

  return (
    <div className="space-y-6 pb-24">
      <section className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-slate-950 via-blue-950/80 to-slate-950 p-5 shadow-xl sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(59,130,246,.22),transparent_34%),radial-gradient(circle_at_20%_100%,rgba(14,165,233,.12),transparent_38%)]" aria-hidden />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div><h1 className="font-display text-3xl font-bold tracking-tight text-white">Community</h1><p className="mt-1 text-sm text-slate-300">Learn together. Ask questions. Share progress. Help others.</p></div>
          <div className="flex w-full gap-2 xl:max-w-xl">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input value={communityQuery} onChange={(event)=>setCommunityQuery(event.target.value)} placeholder="Search the community…" className="h-11 border-slate-600/70 bg-slate-950/70 pl-9 text-white placeholder:text-slate-400"/></div>
            <Button onClick={()=>document.getElementById("communityMessage")?.focus()} className="h-11"><Pencil className="size-4"/>New Post</Button>
          </div>
        </div>
      </section>

      {needsName || editingName ? (
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-4"><form onSubmit={handleName} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1 space-y-1.5"><Label htmlFor="communityName">{displayName ? "Change display name" : "Choose your display name"}</Label><Input id="communityName" value={nameDraft} onChange={(event)=>setNameDraft(event.target.value)} placeholder="For example, Dave B" maxLength={24}/></div><Button type="submit" disabled={saving}>{saving?"Saving":"Save name"}</Button>{displayName?<Button type="button" variant="ghost" onClick={()=>setEditingName(false)}>Cancel</Button>:null}</form></section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {title:"Ask a Question",subtitle:"Get help from the community",icon:CircleHelp,classes:"from-blue-600 to-blue-700"},
          {title:"Share Progress",subtitle:"Celebrate your wins",icon:TrendingUp,classes:"from-emerald-600 to-emerald-700"},
          {title:"Discuss Topics",subtitle:"Talk about IT, certs, and more",icon:Users,classes:"from-violet-600 to-purple-700"},
          {title:"Showcase Projects",subtitle:"Share what you've built",icon:Rocket,classes:"from-orange-600 to-amber-700"},
        ].map((item)=><button key={item.title} type="button" onClick={()=>document.getElementById("communityMessage")?.focus()} className={cn("group rounded-xl bg-gradient-to-br p-4 text-left text-white shadow-lg",item.classes)}><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-white/15"><item.icon className="size-6"/></span><div><p className="font-display font-bold">{item.title}</p><p className="mt-1 text-xs text-white/75">{item.subtitle}</p></div><ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-1"/></div></button>)}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Communities</h2><button type="button" className="text-xs font-semibold text-primary" onClick={()=>document.querySelector<HTMLSelectElement>('select[aria-label="Community"]')?.focus()}>View all →</button></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">{popularTopics.map((item)=>{const Icon=item.icon;return <button key={item.label} type="button" onClick={()=>void navigate({search:{room:item.room}})} className="rounded-xl border border-border/70 bg-card/80 p-3 text-center transition hover:border-primary/50 hover:bg-card"><span className="mx-auto grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5"/></span><p className="mt-2 text-xs font-bold">{item.label}</p><p className="mt-1 text-[10px] text-muted-foreground">Community</p></button>})}</div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/55">
          <div className="border-b border-border/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold">Latest Discussions</h2><p className="text-xs text-muted-foreground">{roomTitle(room)}</p></div><div className="flex items-center gap-2">{room!==GENERAL_ROOM?<Button size="sm" variant={membership.joined?"secondary":"default"} disabled={membership.loading||membership.changing} onClick={async()=>{try{const joined=await membership.toggle();toast.success(joined?`Joined ${roomTitle(room)}`:`Left ${roomTitle(room)}`)}catch{toast.error("Could not update membership.")}}}>{membership.changing?"Saving…":membership.joined?"Joined ✓":"Join Community"}</Button>:null}<select aria-label="Community" value={room} onChange={(event)=>void navigate({search:{room:event.target.value}})} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">{rooms.map((entry)=><option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></div></div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1"><Button size="sm" variant={postFilter==="all"&&feedMode==="latest"?"default":"outline"} onClick={()=>{setFeedMode("latest");setPostFilter("all")}}>All Posts</Button><Button size="sm" variant={feedMode==="popular"?"default":"outline"} onClick={()=>setFeedMode("popular")}>Popular</Button>{postTypes.map((type)=><Button key={type.value} size="sm" variant={postFilter===type.value?"default":"outline"} onClick={()=>{setFeedMode("latest");setPostFilter(type.value)}}>{type.label}</Button>)}</div>
          </div>

          <form onSubmit={handleSend} className="border-b border-border/60 p-4">
            <div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{(displayName||"?").charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><Textarea id="communityMessage" value={draft} onChange={(event)=>setDraft(event.target.value)} disabled={!displayName} maxLength={1000} rows={2} placeholder={displayName?"Start a discussion, ask a question, or share progress…":"Choose a display name to post"} className="min-h-16 resize-none"/>{postImagePreview?<div className="relative mt-2 overflow-hidden rounded-xl bg-secondary"><img src={postImagePreview} alt="Post preview" className="max-h-80 w-full object-contain"/><button type="button" onClick={()=>{setPostImage(null);URL.revokeObjectURL(postImagePreview);setPostImagePreview(null)}} className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-xs font-semibold">Remove</button></div>:null}<div className="mt-2 flex flex-wrap gap-1">{postTypes.map((type)=><button key={type.value} type="button" onClick={()=>setPostType(type.value)} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold",postType===type.value?"border-primary bg-primary/10 text-primary":"border-border text-muted-foreground")}>{type.label}</button>)}</div><div className="mt-2 flex items-center justify-between"><input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event)=>{const file=event.target.files?.[0]??null;if(!file)return;if(file.size>8*1024*1024){toast.error("Keep images under 8 MB.");return;}if(postImagePreview)URL.revokeObjectURL(postImagePreview);setPostImage(file);setPostImagePreview(URL.createObjectURL(file));}}/><button type="button" onClick={()=>imageInputRef.current?.click()} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ImagePlus className="size-4"/>Photo</button><Button type="submit" size="sm" disabled={!displayName||sending||(!draft.trim()&&!postImage)}>{sending?"Posting":"Post"}</Button></div></div></div>
          </form>

          <div>
            {loading?<p className="p-5 text-sm text-muted-foreground">Loading discussions…</p>:filteredFeed.length===0?<div className="p-8 text-center"><MessagesSquare className="mx-auto size-8 text-muted-foreground"/><p className="mt-3 font-semibold">{communityQuery?"No discussions match that search.":"Start the conversation"}</p></div>:filteredFeed.map((message)=>{const mine=message.userId===userId;const identity=communityProfiles[message.userId];const shownName=mine?displayName||"You":identity?.displayName||message.displayName;const avatarUrl=mine?ownProfile.avatarUrl:identity?.avatarUrl;const initial=shownName.trim().charAt(0).toUpperCase()||"?";return <article key={message.id} className="flex gap-3 border-b border-border/60 p-4 last:border-0"><Link to="/profile/$userId" params={{userId:message.userId}} className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary">{avatarUrl?<img src={avatarUrl} alt="" className="h-full w-full object-cover"/>:initial}</Link><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Link to="/profile/$userId" params={{userId:message.userId}} className="truncate text-sm font-bold hover:underline">{mine?"You":shownName}</Link><span className="text-xs text-muted-foreground">· {timeLabel(message.createdAt)}</span><span className="ml-auto">{mine?<button type="button" onClick={()=>{setEditingPost(message.id);setEditDraft(message.body)}} className="p-1 text-muted-foreground"><Pencil className="size-4"/></button>:<button type="button" onClick={()=>void report({messageId:message.id})} className="p-1 text-muted-foreground"><Flag className="size-4"/></button>}</span></div><div className="mt-1"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{postTypes.find((type)=>type.value===message.postType)?.label ?? "Discussion"}</span></div>{editingPost===message.id?<form className="mt-2 space-y-2" onSubmit={async(event)=>{event.preventDefault();const problem=checkMessage(editDraft);if(problem)return void toast.error(problem);await edit({id:message.id,body:editDraft});setEditingPost(null)}}><Textarea value={editDraft} onChange={(event)=>setEditDraft(event.target.value)}/><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={()=>setEditingPost(null)}>Cancel</Button><Button size="sm" type="submit">Save</Button></div></form>:<p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p>}{message.imageUrl?<img src={message.imageUrl} alt="" className="mt-3 max-h-96 w-full rounded-xl object-cover"/>:null}<div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><button onClick={()=>void toggleLike(message)} className={cn("rounded-lg border border-border/60 px-2 py-1.5",message.liked&&"text-primary")}><Heart className={cn("mr-1 inline size-3.5",message.liked&&"fill-current")}/>{message.likeCount||0}</button><button onClick={async()=>{if(openComments===message.id){setOpenComments(null);return;}setOpenComments(message.id);setComments(await getComments(message.id));}} className="rounded-lg border border-border/60 px-2 py-1.5"><MessageCircle className="mr-1 inline size-3.5"/>{message.commentCount||0}</button><button onClick={()=>void toggleSave(message)} className="rounded-lg border border-border/60 px-2 py-1.5"><Bookmark className="mr-1 inline size-3.5"/>Save</button><button onClick={()=>{void navigator.clipboard?.writeText(location.href);toast.success("Community link copied.");}} className="rounded-lg border border-border/60 px-2 py-1.5"><Share2 className="mr-1 inline size-3.5"/>Share</button></div>{openComments===message.id?<div className="mt-3 space-y-2 border-t border-border/50 pt-3">{comments.map((comment)=><div key={comment.id} className="rounded-xl bg-secondary/50 p-3"><p className="text-xs font-bold">{comment.userId===userId?"You":comment.displayName}</p><p className="mt-1 text-sm">{comment.body}</p></div>)}<form onSubmit={async(event)=>{event.preventDefault();if(!commentDraft.trim())return;await addComment(message.id,commentDraft,displayName);setCommentDraft("");setComments(await getComments(message.id));}} className="flex gap-2"><Input value={commentDraft} onChange={(event)=>setCommentDraft(event.target.value)} placeholder="Write a reply…"/><Button size="icon"><Send className="size-4"/></Button></form></div>:null}</div></article>})}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-4"><h3 className="font-display font-bold">Community Stats</h3><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><Users className="mx-auto size-4 text-primary"/><p className="mt-1 font-bold">{Object.keys(communityProfiles).length}</p><p className="text-[10px] text-muted-foreground">Members</p></div><div><MessageCircle className="mx-auto size-4 text-primary"/><p className="mt-1 font-bold">{messages.length}</p><p className="text-[10px] text-muted-foreground">Posts</p></div><div><Sparkles className="mx-auto size-4 text-primary"/><p className="mt-1 font-bold">{messages.reduce((sum,item)=>sum+item.commentCount,0)}</p><p className="text-[10px] text-muted-foreground">Replies</p></div></div></div>
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/80 to-card/70 p-4"><div className="flex items-center gap-2"><CircleHelp className="size-4 text-primary"/><h3 className="font-display font-bold">Need help?</h3></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Stuck on something? Bring the problem to Troubleshooting Help and work through it with other learners.</p><Button size="sm" variant="outline" className="mt-3 w-full" onClick={()=>void navigate({search:{room:"troubleshooting-help"}})}>Ask the community <ArrowRight className="size-3.5"/></Button></div>
          <div className="rounded-2xl border border-border/70 bg-card/70 p-4 text-xs leading-5 text-muted-foreground"><p className="font-bold text-foreground">Community standards</p><p className="mt-2">Learn openly. Help when you can. Disagree respectfully. Report content that crosses the line.</p></div>
        </aside>
      </div>
    </div>
  );
}

function DockButton({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active?:boolean;onClick?:()=>void}){return <button type="button" onClick={onClick} className={cn("flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-muted-foreground",active&&"text-primary")}>{icon}<span>{label}</span></button>}

function SocialNav({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active?:boolean;onClick?:()=>void}){return <button onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary/70",active&&"bg-primary/10 text-primary")}>{icon}{label}</button>}

function SocialHero() {
  return <header className="mx-auto mb-3 flex max-w-2xl items-center justify-between border-b border-border/60 pb-3"><div><h1 className="font-display text-2xl font-semibold tracking-tight">Community</h1><p className="text-xs text-muted-foreground">IT PATH Network</p></div><button aria-label="Search community" className="rounded-full p-2 text-muted-foreground hover:bg-secondary"><Search className="size-5"/></button></header>
}

function CommunityHero() {
  return (
    <header className="mb-5 flex items-start gap-4 border-b border-border/70 pb-5">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="size-6" aria-hidden /></div>
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Community</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">Study together, ask questions, share knowledge, and help each other succeed.</p>
      </div>
    </header>
  );
}
