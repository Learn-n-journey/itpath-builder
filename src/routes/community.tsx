import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Bookmark,
  BookOpen,
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
import { useCommunityChat } from "@/hooks/use-community-chat";
import { useDisplayName } from "@/hooks/use-display-name";
import { checkDisplayName, checkMessage } from "@/lib/community/word-filter";
import { GENERAL_ROOM, isValidRoom, roomTitle, topicForRoom } from "@/lib/community/rooms";
import { currentJourneyTopic, journeyTopics } from "@/lib/journey-order";
import { cn } from "@/lib/utils";

// Community workspace: responsive room navigation, conversation feed, and study context.

export const Route = createFileRoute("/community")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>): { room?: string } => ({
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
  const room = isValidRoom(search.room) ? search.room : GENERAL_ROOM;
  const { displayName, loading: nameLoading, saveDisplayName, saving } = useDisplayName();
  const { messages, loading, send, sending, remove, report, toggleLike, toggleSave, getComments, addComment } = useCommunityChat(room);
  const [openComments,setOpenComments]=useState<string|null>(null);
  const [comments,setComments]=useState<any[]>([]);
  const [commentDraft,setCommentDraft]=useState("");
  const [feedMode,setFeedMode]=useState<"latest"|"popular">("latest");
  const [draft, setDraft] = useState("");
  const [postImage,setPostImage]=useState<File|null>(null);
  const [postImagePreview,setPostImagePreview]=useState<string|null>(null);
  const imageInputRef=useRef<HTMLInputElement>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const rooms = useMemo(() => {
    const sections = journeyTopics(user);
    const current = currentJourneyTopic(user);
    const ordered = current ? [current, ...sections.filter((topic) => topic.id !== current.id)] : sections;
    return [{ id: GENERAL_ROOM, label: "General" }, ...ordered.map((topic) => ({ id: topic.id, label: topic.title }))];
  }, [user]);

  useEffect(() => setNameDraft(displayName), [displayName]);



  const needsName = ready && Boolean(userId) && !nameLoading && !displayName;
  const sectionId = topicForRoom(room);
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
      await send({ body: draft || " ", displayName, image: postImage });
      setDraft("");
      setPostImage(null); if(postImagePreview)URL.revokeObjectURL(postImagePreview); setPostImagePreview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not send.");
    }
  }

  return (
    <>
      <SocialHero />

      {needsName || editingName ? (
        <section className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <form onSubmit={handleName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="communityName">{displayName ? "Change display name" : "Choose your display name"}</Label>
              <Input id="communityName" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder="For example, Dave B" maxLength={24} />
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving" : "Save name"}</Button>
            {displayName ? <Button type="button" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button> : null}
          </form>
        </section>
      ) : null}

      <div className="mx-auto max-w-2xl pb-28">
        <aside className="hidden">
          <nav className="sticky top-4 space-y-1">
            <SocialNav icon={<Home className="size-5"/>} label="Home" active />
            <SocialNav icon={<TrendingUp className="size-5"/>} label="Popular" onClick={()=>setFeedMode("popular")} />
            <SocialNav icon={<MessageCircle className="size-5"/>} label="Study rooms" />
            <SocialNav icon={<Bookmark className="size-5"/>} label="Saved" />
            <div className="my-4 border-t border-border/60" />
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[.16em] text-muted-foreground">Your communities</p>
            {rooms.slice(0,7).map(entry=><button key={entry.id} onClick={()=>void navigate({search:{room:entry.id}})} className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/70",room===entry.id&&"bg-primary/10 font-semibold text-primary")}><Hash className="size-4"/><span className="truncate">{entry.label}</span></button>)}
          </nav>
        </aside>

        <section className="min-w-0">
          <form onSubmit={handleSend} className="mb-2 border-b border-border/60 bg-background pb-3">
            <div className="flex gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{(displayName||"?").charAt(0).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="communityMessage" className="sr-only">Share something</Label>
                <Textarea id="communityMessage" value={draft} onChange={e=>setDraft(e.target.value)} disabled={!displayName} maxLength={1000} rows={2} placeholder={displayName?"Share something…":"Choose a display name to post"} className="min-h-16 resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"/>
                {postImagePreview&&<div className="relative mt-2 overflow-hidden rounded-xl bg-secondary"><img src={postImagePreview} alt="Post preview" className="max-h-80 w-full object-contain"/><button type="button" onClick={()=>{setPostImage(null);URL.revokeObjectURL(postImagePreview);setPostImagePreview(null)}} className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-xs font-semibold shadow">Remove</button></div>}
                <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
                  <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={e=>{const file=e.target.files?.[0]??null;if(!file)return;if(file.size>8*1024*1024){toast.error("Keep images under 8 MB.");return;}if(postImagePreview)URL.revokeObjectURL(postImagePreview);setPostImage(file);setPostImagePreview(URL.createObjectURL(file));}}/>
                  <button type="button" onClick={()=>imageInputRef.current?.click()} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"><ImagePlus className="size-4"/>Photo</button>
                  <Button type="submit" size="sm" disabled={!displayName||sending||(!draft.trim()&&!postImage)}>{sending?"Posting":"Post"}</Button>
                </div>
              </div>
            </div>
          </form>
          <div className="mb-2 flex items-center justify-between border-b border-border/60 py-2"><div className="flex gap-4"><button onClick={()=>setFeedMode("latest")} className={cn("text-sm font-semibold",feedMode==="latest"?"text-foreground":"text-muted-foreground")}>Latest</button><button onClick={()=>setFeedMode("popular")} className={cn("text-sm font-semibold",feedMode==="popular"?"text-foreground":"text-muted-foreground")}>Popular</button></div><select aria-label="Community" value={room} onChange={e=>void navigate({search:{room:e.target.value}})} className="max-w-40 bg-transparent text-right text-xs text-muted-foreground outline-none">{rooms.map(entry=><option key={entry.id} value={entry.id}>{entry.label}</option>)}</select></div>
          <div ref={listRef} className="space-y-3">
            {loading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading the room.</p>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-secondary"><MessagesSquare className="size-5 text-muted-foreground" aria-hidden /></div>
                <div>
                  <p className="font-semibold">{sectionId ? `Start the ${title} conversation` : "Welcome to General"}</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">{sectionId ? "Ask a question, share what clicked, or help someone studying the same topic." : "Say hello, ask for help, share a win, or help another learner."}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {feedMessages.map((message) => {
                  const mine = message.userId === userId;
                  const shownName = mine ? displayName || "You" : message.displayName;
                  const initial = shownName.trim().charAt(0).toUpperCase() || "?";
                  return (
                    <article key={message.id} className="group flex gap-3 border-b border-border/60 bg-background px-1 py-4">
                      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold", mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>{initial}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{mine ? "You" : message.displayName}</span>
                          {mine ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">You</span> : null}
                          <span className="text-xs text-muted-foreground">{timeLabel(message.createdAt)}</span>
                          <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            {mine ? (
                              <button type="button" aria-label="Delete your message" className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={async () => { try { await remove(message.id); } catch { toast.error("That did not delete. Try again."); } }}><Trash2 className="size-3.5" aria-hidden /></button>
                            ) : (
                              <button type="button" aria-label="Report this message" className="rounded p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={async () => { try { await report({ messageId: message.id }); toast.success("Reported. Thank you for flagging it."); } catch { toast.error("That did not send. Try again."); } }}><Flag className="size-3.5" aria-hidden /></button>
                            )}
                          </span>
                        </div>
                        {message.body.trim()&&<p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-6">{message.body}</p>}{message.imageUrl&&<img src={message.imageUrl} alt="" loading="lazy" className="mt-3 max-h-[32rem] w-full rounded-xl object-cover"/>}
                        <div className="mt-3 flex items-center justify-between text-muted-foreground">
                          <button onClick={()=>void toggleLike(message)} className={cn("flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold transition-colors hover:bg-secondary",message.liked&&"text-rose-500")}><Heart className={cn("size-4",message.liked&&"fill-current")}/>{message.likeCount||""}<span className="hidden sm:inline">Like</span></button>
                          <button onClick={async()=>{if(openComments===message.id){setOpenComments(null);return;}setOpenComments(message.id);setComments(await getComments(message.id));}} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"><MessageCircle className="size-4"/>{message.commentCount||""}<span className="hidden sm:inline">Comment</span></button>
                          <button onClick={()=>void toggleSave(message)} className={cn("flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold hover:bg-secondary",message.saved?"text-primary":"text-muted-foreground")}><Bookmark className={cn("size-4",message.saved&&"fill-current")}/><span className="hidden sm:inline">Save</span></button>
                          <button onClick={()=>{void navigator.clipboard?.writeText(location.href);toast.success("Community link copied.");}} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"><Share2 className="size-4"/><span className="hidden sm:inline">Share</span></button>
                        </div>
                        {openComments===message.id&&<div className="mt-2 space-y-2 border-t border-border/50 pt-3">{comments.map(comment=><div key={comment.id} className="flex gap-2"><div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">{comment.displayName.charAt(0).toUpperCase()}</div><div className="rounded-2xl bg-secondary/60 px-3 py-2"><p className="text-xs font-bold">{comment.userId===userId?"You":comment.displayName}</p><p className="text-sm">{comment.body}</p></div></div>)}<form onSubmit={async e=>{e.preventDefault();if(!commentDraft.trim())return;await addComment(message.id,commentDraft,displayName);setCommentDraft("");setComments(await getComments(message.id));}} className="flex gap-2"><Input value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} placeholder="Write a comment…" maxLength={1000}/><Button size="icon" type="submit"><Send className="size-4"/></Button></form></div>}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

        </section>

        <aside className="hidden">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary"/><h3 className="font-semibold">Welcome to IT PATH</h3></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">A community built around learning, troubleshooting, certifications and helping each other move forward.</p></div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm"><h3 className="font-semibold">Popular communities</h3><div className="mt-3 space-y-2">{rooms.slice(1,6).map((entry,i)=><button key={entry.id} onClick={()=>void navigate({search:{room:entry.id}})} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-secondary/60"><div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary">#{i+1}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{entry.label}</p><p className="text-xs text-muted-foreground">Study community</p></div></button>)}</div></div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground"><p className="font-semibold text-foreground">Community standards</p><p className="mt-2">Learn openly. Help when you can. Disagree respectfully. Report content that crosses the line.</p></div>
        </aside>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t border-border/70 bg-background/95 px-4 pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl" style={{paddingBottom:"max(.6rem, env(safe-area-inset-bottom))",position:"fixed"}}>
        <div className="mx-auto flex max-w-md items-center justify-around">
          <DockButton icon={<Home className="size-5"/>} label="Home" active onClick={()=>{setFeedMode("latest");void navigate({search:{room:GENERAL_ROOM}})}}/>
          <DockButton icon={<TrendingUp className="size-5"/>} label="Popular" active={feedMode==="popular"} onClick={()=>setFeedMode("popular")}/>
          <DockButton icon={<ImagePlus className="size-5"/>} label="Post" onClick={()=>document.getElementById("communityMessage")?.focus()}/>
          <DockButton icon={<Hash className="size-5"/>} label="Rooms" onClick={()=>{const el=document.querySelector<HTMLSelectElement>('select[aria-label="Community"]');el?.focus();el?.click();}}/>
          <DockButton icon={<MessagesSquare className="size-5"/>} label="Messages" onClick={()=>void navigate({to:"/messages"} as any)}/>
        </div>
      </nav>
    </>
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
