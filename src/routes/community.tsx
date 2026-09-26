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
  Award,
  FlaskConical,
  Trophy,
  FolderKanban,
  Flame,
} from "lucide-react";
import { toast } from "sonner";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/state/auth-state";
import { useAppState } from "@/state/app-state";
import { useCommunityChat, useCommunityPostStream, type CommunityPostType } from "@/hooks/use-community-chat";
import { useCommunityMembership, useCommunityMemberCount, useMyCommunityMemberships } from "@/hooks/use-community-membership";
import { useSocialMessaging } from "@/hooks/use-social-messaging";
import { useDisplayName } from "@/hooks/use-display-name";
import { useProfile, useProfiles } from "@/hooks/use-profile";
import { useCommunityLearningActivity, type LearningActivity } from "@/hooks/use-learning-activity";
import { checkDisplayName, checkMessage } from "@/lib/community/word-filter";
import { COMMUNITY_ROOMS, GENERAL_ROOM, communityForRoom, isValidRoom, roomTitle } from "@/lib/community/rooms";
import { cn } from "@/lib/utils";
import { domain } from "@/domain/active";

// Community workspace: responsive room navigation, conversation feed, and study context.

export const Route = createFileRoute("/community")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { room?: string | undefined } => ({
    room: typeof search["room"] === "string" ? search["room"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Community and study rooms | ${domain.appName}` },
      { name: "description", content: `Talk with other ${domain.appName} learners in general chat or focused community rooms.` },
      { property: "og:title", content: `Community and study rooms | ${domain.appName}` },
      { property: "og:description", content: `General chat plus focused communities for ${domain.field} learners.` },
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
  const isAutoPath = domain.id === "auto-repair";
  const { user } = useAppState();
  const navigate = useNavigate({ from: "/community" });
  const search = Route.useSearch();
  const room = search.room && isValidRoom(search.room) ? search.room : GENERAL_ROOM;
  const { displayName, loading: nameLoading, saveDisplayName, saving } = useDisplayName();
  const { profile: ownProfile } = useProfile();
  const { messages, loading, send, sending, edit, editing, remove, report, toggleLike, toggleSave, getComments, addComment } = useCommunityChat(room);
  const membership = useCommunityMembership(room);
  const memberCount = useCommunityMemberCount(room);
  const { messages: communityStream, loading: streamLoading } = useCommunityPostStream();
  const scopedCommunityStream = useMemo(() => communityStream.filter((message) => isValidRoom(message.room || GENERAL_ROOM)), [communityStream]);
  const { rooms: joinedRooms, loading: membershipsLoading } = useMyCommunityMemberships();
  const { friendships, loading: friendshipsLoading } = useSocialMessaging();
  const { activities: sharedActivity, loading: activityLoading } = useCommunityLearningActivity();
  const profileIds = useMemo(() => [...new Set([...messages.map((message) => message.userId), ...scopedCommunityStream.map((message) => message.userId), ...sharedActivity.map((activity) => activity.userId)])], [messages, scopedCommunityStream, sharedActivity]);
  const { profiles: communityProfiles } = useProfiles(profileIds);
  const [openComments,setOpenComments]=useState<string|null>(null);
  const [comments,setComments]=useState<any[]>([]);
  const [commentDraft,setCommentDraft]=useState("");
  const [feedMode,setFeedMode]=useState<"latest"|"popular"|"activity">("latest");
  const [socialView,setSocialView]=useState<"for-you"|"friends"|"communities"|"discover">("for-you");
  const [draft, setDraft] = useState("");
  const [postType, setPostType] = useState<CommunityPostType>("discussion");
  const [postFilter, setPostFilter] = useState<CommunityPostType | "all">("all");
  const [communityTab, setCommunityTab] = useState<"feed" | "questions" | "projects" | "about">("feed");
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
  const activeCommunity = communityForRoom(room);
  const feedMessages=useMemo(()=>feedMode==="popular" ? [...messages].sort((a,b)=>(b.likeCount+b.commentCount*2)-(a.likeCount+a.commentCount*2)) : [...messages].reverse(),[messages,feedMode]);
  const activityFeed = room === GENERAL_ROOM && !isAutoPath ? sharedActivity : [];

  if (ready && !userId) {
    return (
      <>
        <CommunityHero />
        <Panel title="Sign in to join" description={`The rooms are for people with a ${domain.appName} account.`}>
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

  const effectivePostFilter: CommunityPostType | "all" =
    communityTab === "questions" ? "question" : communityTab === "projects" ? "project" : postFilter;
  const typeFilteredFeed = effectivePostFilter === "all" ? feedMessages : feedMessages.filter((message) => message.postType === effectivePostFilter);
  const filteredFeed = communityQuery.trim()
    ? typeFilteredFeed.filter((message) => message.body.toLowerCase().includes(communityQuery.trim().toLowerCase()) || message.displayName.toLowerCase().includes(communityQuery.trim().toLowerCase()))
    : typeFilteredFeed;
  const friendIds = useMemo(() => new Set(friendships.filter((friendship) => friendship.status === "accepted").map((friendship) => friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId)), [friendships, userId]);
  const mixedFeed = useMemo(() => {
    if (room !== GENERAL_ROOM || communityTab !== "feed" || feedMode !== "latest" || postFilter !== "all") return [];
    const query = communityQuery.trim().toLowerCase();
    const matchesSearch = (text: string) => !query || text.toLowerCase().includes(query);
    const candidatePosts = socialView === "communities" ? scopedCommunityStream.filter((message) => Boolean(message.room && joinedRooms.includes(message.room))) : scopedCommunityStream;
    const postItems = candidatePosts
      .filter((message) => {
        const identity = message.userId === userId ? ownProfile : communityProfiles[message.userId];
        const inSearch = matchesSearch(message.body) || matchesSearch(message.displayName) || matchesSearch(identity?.displayName ?? "");
        if (!inSearch) return false;
        if (socialView === "friends") return friendIds.has(message.userId);
        if (socialView === "for-you") return message.userId === userId || friendIds.has(message.userId) || Boolean(message.room && joinedRooms.includes(message.room));
        return true;
      })
      .map((message) => ({ kind: "post" as const, at: message.createdAt, message }));
    const activityItems = activityFeed
      .filter((activity) => {
        const identity = activity.userId === userId ? ownProfile : communityProfiles[activity.userId];
        const inSearch = matchesSearch(activity.title) || matchesSearch(activity.description ?? "") || matchesSearch(identity?.displayName ?? "");
        if (!inSearch || socialView === "communities") return false;
        if (socialView === "friends") return friendIds.has(activity.userId);
        if (socialView === "for-you") return activity.userId === userId || friendIds.has(activity.userId);
        return true;
      })
      .map((activity) => ({ kind: "activity" as const, at: activity.occurredAt, activity }));
    return [...postItems, ...activityItems].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [activityFeed, communityProfiles, communityQuery, scopedCommunityStream, communityTab, feedMode, friendIds, joinedRooms, ownProfile, postFilter, room, socialView, userId]);
  const showingMixedFeed = room === GENERAL_ROOM && communityTab === "feed" && feedMode === "latest" && postFilter === "all";
  const showingDiscover = showingMixedFeed && socialView === "discover";
  const discoverPeople = useMemo(() => {
    const seen = new Set<string>();
    return [...scopedCommunityStream].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).filter((message) => {
      if (message.userId === userId || friendIds.has(message.userId) || seen.has(message.userId)) return false;
      seen.add(message.userId);
      return true;
    }).slice(0, 6).map((message) => ({ userId: message.userId, profile: communityProfiles[message.userId], fallbackName: message.displayName }));
  }, [communityProfiles, scopedCommunityStream, friendIds, userId]);
  const discoverProjects = useMemo(() => scopedCommunityStream.filter((message) => message.postType === "project").slice(0, 4), [scopedCommunityStream]);
  const discoverDiscussions = useMemo(() => [...scopedCommunityStream].sort((a, b) => (b.likeCount + b.commentCount * 2) - (a.likeCount + a.commentCount * 2)).slice(0, 4), [scopedCommunityStream]);
  const discoverActivity = useMemo(() => activityFeed.filter((activity) => activity.userId !== userId).slice(0, 4), [activityFeed, userId]);
  const mixedFeedLoading = loading || streamLoading || activityLoading || membershipsLoading || friendshipsLoading;
  const postTypes: Array<{value: CommunityPostType; label: string}> = [
    { value: "question", label: "Question" },
    { value: "troubleshooting", label: "Troubleshooting" },
    { value: "discussion", label: "Discussion" },
    { value: "progress", label: "Progress" },
    { value: "project", label: "Project" },
    { value: "study-help", label: "Study Help" },
  ];
  const popularTopics = isAutoPath
    ? [
        { label: "New to Auto", room: "auto-new-to-auto", icon: CircleHelp },
        { label: "DIY Garage", room: "auto-diy-garage", icon: Wrench },
        { label: "Aspiring Technicians", room: "auto-aspiring-techs", icon: BriefcaseBusiness },
        { label: "ASE Study", room: "auto-ase-study", icon: GraduationCap },
        { label: "Diagnostics", room: "auto-diagnostics", icon: Terminal },
        { label: "Electrical", room: "auto-electrical", icon: Sparkles },
        { label: "Engine & Drivability", room: "auto-engine", icon: Wrench },
        { label: "Repair Help", room: "auto-troubleshooting-help", icon: Wrench },
      ]
    : [
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
    <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:space-y-6">
      <section className="relative overflow-hidden rounded-none border-y border-primary/25 bg-gradient-to-r from-slate-950 via-blue-950/80 to-slate-950 p-4 shadow-xl sm:rounded-2xl sm:border sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(59,130,246,.22),transparent_34%),radial-gradient(circle_at_20%_100%,rgba(14,165,233,.12),transparent_38%)]" aria-hidden />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div><h1 className="font-display text-3xl font-bold tracking-tight text-white">Community</h1><p className="mt-1 text-sm text-slate-300">Learn together. Ask questions. Share progress. Help others.</p></div>
          <div className="flex w-full flex-col gap-2 min-[420px]:flex-row xl:max-w-xl">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input value={communityQuery} onChange={(event)=>setCommunityQuery(event.target.value)} placeholder="Search the community…" className="h-11 border-slate-600/70 bg-slate-950/70 pl-9 text-white placeholder:text-slate-400"/></div>
            <Button onClick={()=>document.getElementById("communityMessage")?.focus()} className="h-11 shrink-0"><Pencil className="size-4"/>New Post</Button>
          </div>
        </div>
      </section>

      {needsName || editingName ? (
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-4"><form onSubmit={handleName} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1 space-y-1.5"><Label htmlFor="communityName">{displayName ? "Change display name" : "Choose your display name"}</Label><Input id="communityName" value={nameDraft} onChange={(event)=>setNameDraft(event.target.value)} placeholder="For example, Dave B" maxLength={24}/></div><Button type="submit" disabled={saving}>{saving?"Saving":"Save name"}</Button>{displayName?<Button type="button" variant="ghost" onClick={()=>setEditingName(false)}>Cancel</Button>:null}</form></section>
      ) : null}

      <section className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        {[
          {title:"Ask a Question",subtitle:"Get help from the community",icon:CircleHelp,classes:"from-blue-600 to-blue-700"},
          {title:"Share Progress",subtitle:"Celebrate your wins",icon:TrendingUp,classes:"from-emerald-600 to-emerald-700"},
          {title:"Discuss Topics",subtitle:isAutoPath?"Talk repairs, diagnostics, ASE, and more":"Talk about IT, certs, and more",icon:Users,classes:"from-violet-600 to-purple-700"},
          {title:"Showcase Projects",subtitle:"Share what you've built",icon:Rocket,classes:"from-orange-600 to-amber-700"},
        ].map((item)=><button key={item.title} type="button" onClick={()=>document.getElementById("communityMessage")?.focus()} className={cn("group min-w-[16rem] snap-start rounded-xl bg-gradient-to-br p-4 text-left text-white shadow-lg sm:min-w-0",item.classes)}><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-white/15"><item.icon className="size-6"/></span><div><p className="font-display font-bold">{item.title}</p><p className="mt-1 text-xs text-white/75">{item.subtitle}</p></div><ArrowRight className="ml-auto size-4 transition-transform group-hover:translate-x-1"/></div></button>)}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Communities</h2><button type="button" className="text-xs font-semibold text-primary" onClick={()=>document.querySelector<HTMLSelectElement>('select[aria-label="Community"]')?.focus()}>View all →</button></div>
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 xl:grid-cols-8">{popularTopics.map((item)=>{const Icon=item.icon;return <button key={item.label} type="button" onClick={()=>void navigate({search:{room:item.room}})} className="min-w-[8.5rem] snap-start rounded-xl border border-border/70 bg-card/80 p-3 text-center transition hover:border-primary/50 hover:bg-card sm:min-w-0"><span className="mx-auto grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5"/></span><p className="mt-2 text-xs font-bold">{item.label}</p><p className="mt-1 text-[10px] text-muted-foreground">Community</p></button>})}</div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
        <div className="bg-gradient-to-r from-primary/15 via-card to-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Users className="size-4"/>{room===GENERAL_ROOM?`${domain.appName} Community`:"Community"}</div>
              <h2 className="mt-2 font-display text-2xl font-bold">{activeCommunity.label}</h2>
              <p className="mt-1 text-sm font-medium">{activeCommunity.tagline}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeCommunity.description}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground"><span><Users className="mr-1 inline size-3.5"/>{memberCount.loading?"…":memberCount.count} members</span><span><MessageCircle className="mr-1 inline size-3.5"/>{messages.length} posts</span></div>
            </div>
            {room!==GENERAL_ROOM?<Button variant={membership.joined?"secondary":"default"} disabled={membership.loading||membership.changing} onClick={async()=>{try{const joined=await membership.toggle();toast.success(joined?`Joined ${activeCommunity.label}`:`Left ${activeCommunity.label}`)}catch{toast.error("Could not update membership.")}}}>{membership.changing?"Saving…":membership.joined?"Joined ✓":"Join Community"}</Button>:null}
          </div>
        </div>
        <div className="sticky top-0 z-[5] flex snap-x gap-1 overflow-x-auto border-t border-border/60 bg-card/95 px-3 py-2 backdrop-blur">
          {(["feed","questions","projects","about"] as const).map((tab)=><button key={tab} type="button" onClick={()=>{setCommunityTab(tab);if(tab==="feed")setPostFilter("all")}} className={cn("min-h-11 shrink-0 snap-start rounded-lg px-4 py-2 text-xs font-semibold capitalize transition",communityTab===tab?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-secondary hover:text-foreground")}>{tab}</button>)}
        </div>
      </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/55">
          {communityTab==="about"?<div className="p-6"><div className="max-w-2xl"><h2 className="font-display text-xl font-bold">About {activeCommunity.label}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{activeCommunity.about}</p><div className="mt-5 rounded-xl border border-border/60 bg-secondary/30 p-4"><p className="text-sm font-bold">How to use this community</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Ask useful questions, show what you tried, share progress and projects, and help other learners when you can. Community activity supports learning but never awards mastery or bypasses structured prerequisites.</p></div></div></div>:<>
          <div className="border-b border-border/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold">{communityTab==="questions"?"Questions":communityTab==="projects"?"Projects":"Latest Discussions"}</h2><p className="text-xs text-muted-foreground">{roomTitle(room)}</p></div><select aria-label="Community" value={room} onChange={(event)=>{setCommunityTab("feed");setPostFilter("all");void navigate({search:{room:event.target.value}})}} className="rounded-lg border border-border bg-background px-3 py-2 text-xs">{rooms.map((entry)=><option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></div>
            <div className={cn("mt-3 gap-2 overflow-x-auto pb-1",communityTab==="feed"?"flex":"hidden")}>{room===GENERAL_ROOM?([["for-you","For You"],["friends","Friends"],["communities","Communities"],["discover","Discover"]] as const).map(([value,label])=><Button key={value} size="sm" variant={postFilter==="all"&&feedMode==="latest"&&socialView===value?"default":"outline"} onClick={()=>{setSocialView(value);setFeedMode("latest");setPostFilter("all")}}>{label}</Button>):<Button size="sm" variant={postFilter==="all"&&feedMode==="latest"?"default":"outline"} onClick={()=>{setFeedMode("latest");setPostFilter("all")}}>All Posts</Button>}<Button size="sm" variant={feedMode==="popular"?"default":"outline"} onClick={()=>setFeedMode("popular")}>Popular</Button>{room===GENERAL_ROOM?<Button size="sm" variant={feedMode==="activity"?"default":"outline"} onClick={()=>{setFeedMode("activity");setPostFilter("all")}}>Learning Activity</Button>:null}{postTypes.map((type)=><Button key={type.value} size="sm" variant={postFilter===type.value?"default":"outline"} onClick={()=>{setFeedMode("latest");setPostFilter(type.value)}}>{type.label}</Button>)}</div>
          </div>

          <form onSubmit={handleSend} className="border-b border-border/60 p-4">
            <div className="flex gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{(displayName||"?").charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><Textarea id="communityMessage" value={draft} onChange={(event)=>setDraft(event.target.value)} disabled={!displayName} maxLength={1000} rows={2} placeholder={displayName?"Start a discussion, ask a question, or share progress…":"Choose a display name to post"} className="min-h-16 resize-none"/>{postImagePreview?<div className="relative mt-2 overflow-hidden rounded-xl bg-secondary"><img src={postImagePreview} alt="Post preview" className="max-h-80 w-full object-contain"/><button type="button" onClick={()=>{setPostImage(null);URL.revokeObjectURL(postImagePreview);setPostImagePreview(null)}} className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-xs font-semibold">Remove</button></div>:null}<div className="mt-2 flex flex-wrap gap-1">{postTypes.map((type)=><button key={type.value} type="button" onClick={()=>setPostType(type.value)} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold",postType===type.value?"border-primary bg-primary/10 text-primary":"border-border text-muted-foreground")}>{type.label}</button>)}</div><div className="mt-2 flex items-center justify-between"><input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event)=>{const file=event.target.files?.[0]??null;if(!file)return;if(file.size>8*1024*1024){toast.error("Keep images under 8 MB.");return;}if(postImagePreview)URL.revokeObjectURL(postImagePreview);setPostImage(file);setPostImagePreview(URL.createObjectURL(file));}}/><button type="button" onClick={()=>imageInputRef.current?.click()} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ImagePlus className="size-4"/>Photo</button><Button type="submit" size="sm" disabled={!displayName||sending||(!draft.trim()&&!postImage)}>{sending?"Posting":"Post"}</Button></div></div></div>
          </form>

          <div>
            {showingDiscover ? (
              mixedFeedLoading ? <p className="p-5 text-sm text-muted-foreground">Loading Discover…</p> :
              <DiscoverPanel people={discoverPeople} projects={discoverProjects} discussions={discoverDiscussions} activities={discoverActivity} joinedRooms={joinedRooms} popularTopics={popularTopics} userId={userId} ownProfile={ownProfile} communityProfiles={communityProfiles} navigate={navigate} postTypes={postTypes} editingPost={editingPost} setEditingPost={setEditingPost} editDraft={editDraft} setEditDraft={setEditDraft} edit={edit} report={report} toggleLike={toggleLike} toggleSave={toggleSave} openComments={openComments} setOpenComments={setOpenComments} comments={comments} setComments={setComments} getComments={getComments} commentDraft={commentDraft} setCommentDraft={setCommentDraft} addComment={addComment} displayName={displayName} />
            ) : showingMixedFeed ? (
              mixedFeedLoading ? <p className="p-5 text-sm text-muted-foreground">Loading community…</p> :
              mixedFeed.length===0 ? <div className="p-8 text-center"><MessagesSquare className="mx-auto size-8 text-muted-foreground"/><p className="mt-3 font-semibold">{communityQuery ? "Nothing matches that search." : "Start the conversation"}</p></div> :
              mixedFeed.map((item) => item.kind === "activity"
                ? <CommunityActivityCard key={`activity-${item.activity.id}`} activity={item.activity} viewerId={userId} profile={item.activity.userId===userId ? ownProfile : communityProfiles[item.activity.userId]} />
                : <CommunityPostCard key={`post-${item.message.id}`} message={item.message} userId={userId} displayName={displayName} ownProfile={ownProfile} identity={communityProfiles[item.message.userId]} postTypes={postTypes} editingPost={editingPost} setEditingPost={setEditingPost} editDraft={editDraft} setEditDraft={setEditDraft} edit={edit} report={report} toggleLike={toggleLike} toggleSave={toggleSave} openComments={openComments} setOpenComments={setOpenComments} comments={comments} setComments={setComments} getComments={getComments} commentDraft={commentDraft} setCommentDraft={setCommentDraft} addComment={addComment} />
              )
            ) : communityTab==="feed"&&feedMode==="activity" ? (
              activityLoading ? <p className="p-5 text-sm text-muted-foreground">Loading learning activity…</p> :
              activityFeed.length===0 ? <div className="p-8 text-center"><Trophy className="mx-auto size-8 text-muted-foreground"/><p className="mt-3 font-semibold">No shared learning activity yet</p><p className="mt-1 text-sm text-muted-foreground">Accomplishments appear here when learners choose Friends, Community, or Public sharing.</p></div> :
              activityFeed.map((activity) => <CommunityActivityCard key={activity.id} activity={activity} viewerId={userId} profile={activity.userId===userId ? ownProfile : communityProfiles[activity.userId]} />)
            ) : loading?<p className="p-5 text-sm text-muted-foreground">Loading discussions…</p>:filteredFeed.length===0?<div className="p-8 text-center"><MessagesSquare className="mx-auto size-8 text-muted-foreground"/><p className="mt-3 font-semibold">{communityQuery?"No discussions match that search.":communityTab==="questions"?"No questions yet. Ask the first one.":communityTab==="projects"?"No projects yet. Share what you are building.":"Start the conversation"}</p></div>:filteredFeed.map((message)=>{const mine=message.userId===userId;const identity=communityProfiles[message.userId];const shownName=mine?displayName||"You":identity?.displayName||message.displayName;const avatarUrl=mine?ownProfile.avatarUrl:identity?.avatarUrl;const initial=shownName.trim().charAt(0).toUpperCase()||"?";return <article key={message.id} className="flex gap-3 border-b border-border/60 p-4 last:border-0"><Link to="/profile/$userId" params={{userId:message.userId}} className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary">{avatarUrl?<img src={avatarUrl} alt="" className="h-full w-full object-cover"/>:initial}</Link><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Link to="/profile/$userId" params={{userId:message.userId}} className="truncate text-sm font-bold hover:underline">{mine?"You":shownName}</Link><span className="text-xs text-muted-foreground">· {timeLabel(message.createdAt)}</span><span className="ml-auto">{mine?<button type="button" onClick={()=>{setEditingPost(message.id);setEditDraft(message.body)}} className="p-1 text-muted-foreground"><Pencil className="size-4"/></button>:<button type="button" onClick={()=>void report({messageId:message.id})} className="p-1 text-muted-foreground"><Flag className="size-4"/></button>}</span></div><div className="mt-1"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{postTypes.find((type)=>type.value===message.postType)?.label ?? "Discussion"}</span></div>{editingPost===message.id?<form className="mt-2 space-y-2" onSubmit={async(event)=>{event.preventDefault();const problem=checkMessage(editDraft);if(problem)return void toast.error(problem);await edit({id:message.id,body:editDraft});setEditingPost(null)}}><Textarea value={editDraft} onChange={(event)=>setEditDraft(event.target.value)}/><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={()=>setEditingPost(null)}>Cancel</Button><Button size="sm" type="submit">Save</Button></div></form>:<p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p>}{message.imageUrl?<img src={message.imageUrl} alt="" className="mt-3 max-h-96 w-full rounded-xl object-cover"/>:null}<div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><button onClick={()=>void toggleLike(message)} className={cn("rounded-lg border border-border/60 px-2 py-1.5",message.liked&&"text-primary")}><Heart className={cn("mr-1 inline size-3.5",message.liked&&"fill-current")}/>{message.likeCount||0}</button><button onClick={async()=>{if(openComments===message.id){setOpenComments(null);return;}setOpenComments(message.id);setComments(await getComments(message.id));}} className="rounded-lg border border-border/60 px-2 py-1.5"><MessageCircle className="mr-1 inline size-3.5"/>{message.commentCount||0}</button><button onClick={()=>void toggleSave(message)} className="rounded-lg border border-border/60 px-2 py-1.5"><Bookmark className="mr-1 inline size-3.5"/>Save</button><button onClick={()=>{void navigator.clipboard?.writeText(location.href);toast.success("Community link copied.");}} className="rounded-lg border border-border/60 px-2 py-1.5"><Share2 className="mr-1 inline size-3.5"/>Share</button></div>{openComments===message.id?<div className="mt-3 space-y-2 border-t border-border/50 pt-3">{comments.map((comment)=><div key={comment.id} className="rounded-xl bg-secondary/50 p-3"><p className="text-xs font-bold">{comment.userId===userId?"You":comment.displayName}</p><p className="mt-1 text-sm">{comment.body}</p></div>)}<form onSubmit={async(event)=>{event.preventDefault();if(!commentDraft.trim())return;await addComment(message.id,commentDraft,displayName);setCommentDraft("");setComments(await getComments(message.id));}} className="flex gap-2"><Input value={commentDraft} onChange={(event)=>setCommentDraft(event.target.value)} placeholder="Write a reply…"/><Button size="icon"><Send className="size-4"/></Button></form></div>:null}</div></article>})}
          </div>
          </>}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card/70 p-4"><h3 className="font-display font-bold">Community Stats</h3><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div><Users className="mx-auto size-4 text-primary"/><p className="mt-1 font-bold">{memberCount.loading?"…":memberCount.count}</p><p className="text-[10px] text-muted-foreground">Members</p></div><div><MessageCircle className="mx-auto size-4 text-primary"/><p className="mt-1 font-bold">{messages.length}</p><p className="text-[10px] text-muted-foreground">Posts</p></div><div><Sparkles className="mx-auto size-4 text-primary"/><p className="mt-1 font-bold">{messages.reduce((sum,item)=>sum+item.commentCount,0)}</p><p className="text-[10px] text-muted-foreground">Replies</p></div></div></div>
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
  return <header className="mx-auto mb-3 flex max-w-2xl items-center justify-between border-b border-border/60 pb-3"><div><h1 className="font-display text-2xl font-semibold tracking-tight">Community</h1><p className="text-xs text-muted-foreground">{domain.appName} Network</p></div><button aria-label="Search community" className="rounded-full p-2 text-muted-foreground hover:bg-secondary"><Search className="size-5"/></button></header>
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




function DiscoverPanel({ people, projects, discussions, activities, joinedRooms, popularTopics, userId, ownProfile, communityProfiles, navigate, ...postProps }: any) {
  const suggestedCommunities = popularTopics.filter((topic: any) => !joinedRooms.includes(topic.room)).slice(0, 4);
  return <div className="space-y-6 p-4 sm:p-5">
    <section><div className="mb-3 flex items-center justify-between"><div><h3 className="font-display text-lg font-bold">People to discover</h3><p className="text-xs text-muted-foreground">Learners active around {domain.appName} who are not already your friends.</p></div><Users className="size-5 text-primary"/></div>
      {people.length===0?<p className="rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">No new learners to suggest yet.</p>:<div className="grid gap-2 sm:grid-cols-2">{people.map((person: any)=>{const name=person.profile?.displayName||person.fallbackName||"Learner";return <Link key={person.userId} to="/profile/$userId" params={{userId:person.userId}} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-3 transition hover:border-primary/50"><span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary">{person.profile?.avatarUrl?<img src={person.profile.avatarUrl} alt="" className="h-full w-full object-cover"/>:name.charAt(0).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{name}</p><p className="text-xs text-muted-foreground">View learner profile</p></div><ArrowRight className="ml-auto size-4 text-muted-foreground"/></Link>})}</div>}
    </section>
    <section><div className="mb-3"><h3 className="font-display text-lg font-bold">Communities to explore</h3><p className="text-xs text-muted-foreground">Spaces you have not joined yet.</p></div><div className="grid gap-2 sm:grid-cols-2">{suggestedCommunities.map((topic:any)=>{const Icon=topic.icon;return <button key={topic.room} type="button" onClick={()=>void navigate({search:{room:topic.room}})} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-3 text-left transition hover:border-primary/50"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4"/></span><span className="text-sm font-bold">{topic.label}</span><ArrowRight className="ml-auto size-4 text-muted-foreground"/></button>})}</div></section>
    {projects.length>0?<section><div className="mb-3"><h3 className="font-display text-lg font-bold">Projects worth seeing</h3><p className="text-xs text-muted-foreground">Recent work learners chose to share.</p></div><div className="overflow-hidden rounded-xl border border-border/70">{projects.map((message:any)=><CommunityPostCard key={message.id} message={message} userId={userId} ownProfile={ownProfile} identity={communityProfiles[message.userId]} {...postProps}/>)}</div></section>:null}
    {discussions.length>0?<section><div className="mb-3"><h3 className="font-display text-lg font-bold">Active discussions</h3><p className="text-xs text-muted-foreground">Conversations with the most community interaction right now.</p></div><div className="overflow-hidden rounded-xl border border-border/70">{discussions.map((message:any)=><CommunityPostCard key={message.id} message={message} userId={userId} ownProfile={ownProfile} identity={communityProfiles[message.userId]} {...postProps}/>)}</div></section>:null}
    {activities.length>0?<section><div className="mb-3"><h3 className="font-display text-lg font-bold">Learning happening now</h3><p className="text-xs text-muted-foreground">Shared accomplishments from across the community.</p></div><div className="overflow-hidden rounded-xl border border-border/70">{activities.map((activity:any)=><CommunityActivityCard key={activity.id} activity={activity} viewerId={userId} profile={communityProfiles[activity.userId]}/>)}</div></section>:null}
  </div>;
}

function CommunityPostCard({
  message, userId, displayName, ownProfile, identity, postTypes, editingPost, setEditingPost,
  editDraft, setEditDraft, edit, report, toggleLike, toggleSave, openComments, setOpenComments,
  comments, setComments, getComments, commentDraft, setCommentDraft, addComment,
}: any) {
  const mine = message.userId === userId;
  const shownName = mine ? displayName || "You" : identity?.displayName || message.displayName;
  const avatarUrl = mine ? ownProfile.avatarUrl : identity?.avatarUrl;
  const initial = shownName.trim().charAt(0).toUpperCase() || "?";
  return <article className="flex gap-3 border-b border-border/60 p-4 last:border-0">
    <Link to="/profile/$userId" params={{userId:message.userId}} className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary">{avatarUrl?<img src={avatarUrl} alt="" className="h-full w-full object-cover"/>:initial}</Link>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2"><Link to="/profile/$userId" params={{userId:message.userId}} className="truncate text-sm font-bold hover:underline">{mine?"You":shownName}</Link><span className="text-xs text-muted-foreground">· {timeLabel(message.createdAt)}</span><span className="ml-auto">{mine?<button type="button" onClick={()=>{setEditingPost(message.id);setEditDraft(message.body)}} className="p-1 text-muted-foreground"><Pencil className="size-4"/></button>:<button type="button" onClick={()=>void report({messageId:message.id})} className="p-1 text-muted-foreground"><Flag className="size-4"/></button>}</span></div>
      <div className="mt-1"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{postTypes.find((type:any)=>type.value===message.postType)?.label ?? "Discussion"}</span></div>
      {editingPost===message.id?<form className="mt-2 space-y-2" onSubmit={async(event)=>{event.preventDefault();const problem=checkMessage(editDraft);if(problem)return void toast.error(problem);await edit({id:message.id,body:editDraft});setEditingPost(null)}}><Textarea value={editDraft} onChange={(event)=>setEditDraft(event.target.value)}/><div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={()=>setEditingPost(null)}>Cancel</Button><Button size="sm" type="submit">Save</Button></div></form>:<p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.body}</p>}
      {message.imageUrl?<img src={message.imageUrl} alt="" className="mt-3 max-h-96 w-full rounded-xl object-cover"/>:null}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <button onClick={()=>void toggleLike(message)} className={cn("rounded-lg border border-border/60 px-2 py-1.5",message.liked&&"text-primary")}><Heart className={cn("mr-1 inline size-3.5",message.liked&&"fill-current")}/>{message.likeCount||0}</button>
        <button onClick={async()=>{if(openComments===message.id){setOpenComments(null);return;}setOpenComments(message.id);setComments(await getComments(message.id));}} className="rounded-lg border border-border/60 px-2 py-1.5"><MessageCircle className="mr-1 inline size-3.5"/>{message.commentCount||0}</button>
        <button onClick={()=>void toggleSave(message)} className="rounded-lg border border-border/60 px-2 py-1.5"><Bookmark className="mr-1 inline size-3.5"/>Save</button>
        <button onClick={()=>{void navigator.clipboard?.writeText(location.href);toast.success("Community link copied.");}} className="rounded-lg border border-border/60 px-2 py-1.5"><Share2 className="mr-1 inline size-3.5"/>Share</button>
      </div>
      {openComments===message.id?<div className="mt-3 space-y-2 border-t border-border/50 pt-3">{comments.map((comment:any)=><div key={comment.id} className="rounded-xl bg-secondary/50 p-3"><p className="text-xs font-bold">{comment.userId===userId?"You":comment.displayName}</p><p className="mt-1 text-sm">{comment.body}</p></div>)}<form onSubmit={async(event)=>{event.preventDefault();if(!commentDraft.trim())return;await addComment(message.id,commentDraft,displayName);setCommentDraft("");setComments(await getComments(message.id));}} className="flex gap-2"><Input value={commentDraft} onChange={(event)=>setCommentDraft(event.target.value)} placeholder="Write a reply…"/><Button size="icon"><Send className="size-4"/></Button></form></div>:null}
    </div>
  </article>;
}

function CommunityActivityCard({
  activity,
  viewerId,
  profile,
}: {
  activity: LearningActivity;
  viewerId: string | null;
  profile?: { displayName?: string | null | undefined; avatarUrl?: string | null | undefined } | undefined;
}) {
  const mine = activity.userId === viewerId;
  const shownName = mine ? "You" : profile?.displayName || `${domain.appName} learner`;
  const initial = shownName.trim().charAt(0).toUpperCase() || "?";
  const config = activityPresentation(activity.activityType);

  return (
    <article className="flex gap-3 border-b border-border/60 p-4 last:border-0">
      <Link to="/profile/$userId" params={{ userId: activity.userId }} className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary">
        {profile?.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" /> : initial}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/profile/$userId" params={{ userId: activity.userId }} className="truncate text-sm font-bold hover:underline">{shownName}</Link>
          <span className="text-xs text-muted-foreground">· {timeLabel(activity.occurredAt)}</span>
          <span className="ml-auto rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold capitalize text-muted-foreground">{activity.visibility}</span>
        </div>
        <div className="mt-3 flex gap-3 rounded-xl border border-border/60 bg-secondary/25 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><config.Icon className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">{config.label}</p>
            <p className="mt-0.5 font-semibold">{activity.title}</p>
            {activity.description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{activity.description}</p> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function activityPresentation(type: LearningActivity["activityType"]) {
  switch (type) {
    case "lab_completed": return { label: "Lab completed", Icon: FlaskConical };
    case "mastery_advanced": return { label: "Mastery advanced", Icon: TrendingUp };
    case "achievement_earned": return { label: "Achievement earned", Icon: Award };
    case "project_completed": return { label: "Project completed", Icon: FolderKanban };
    case "streak_milestone": return { label: "Streak milestone", Icon: Flame };
    case "certification_milestone": return { label: "Certification milestone", Icon: GraduationCap };
    case "game_accomplishment": return { label: "Game accomplishment", Icon: Trophy };
    default: return { label: "Learning progress", Icon: BookOpen };
  }
}
