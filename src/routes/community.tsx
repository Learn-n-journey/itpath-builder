import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Bookmark,
  BookOpen,
  Heart,
  Home,
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
  validateSearch: (search: Record<string, unknown>) => ({
    room: typeof search["room"] === "string" ? search["room"] : GENERAL_ROOM,
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
    const problem = checkMessage(draft);
    if (problem) return void toast.error(problem);
    try {
      await send({ body: draft, displayName });
      setDraft("");
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

      <div className="mb-4 rounded-xl border border-border/70 bg-card/30 p-3">
        <Label htmlFor="communityRoom" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Study room
        </Label>
        <select
          id="communityRoom"
          value={room}
          onChange={(event) => void navigate({ search: { room: event.target.value } })}
          className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {rooms.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.id === GENERAL_ROOM ? "General — Public room" : entry.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[14rem_minmax(0,1fr)_18rem]">
        <aside className="hidden xl:block">
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
          <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/55 px-4 py-3 shadow-sm sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <Hash className="size-5 shrink-0 text-primary" aria-hidden />
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-semibold">{title}</h2>
                <p className="text-xs text-muted-foreground">{sectionId ? "Topic study room" : "Public community room"}</p>
              </div>
            </div>
            {displayName && !editingName ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditingName(true)}>
                <Pencil className="size-4" aria-hidden />Change name
              </Button>
            ) : null}
          </header>

          <div className="mb-3 rounded-2xl border border-border/70 bg-card/65 p-4 shadow-sm"><button type="button" onClick={()=>document.getElementById("communityMessage")?.focus()} className="flex w-full items-center gap-3 text-left"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">{(displayName||"?").charAt(0).toUpperCase()}</div><span className="flex-1 rounded-full bg-secondary/70 px-4 py-3 text-sm text-muted-foreground">Share something with the community…</span></button><div className="mt-3 flex gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground"><span className="rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary">Post</span><span className="rounded-full bg-secondary px-3 py-1.5">Question</span><span className="rounded-full bg-secondary px-3 py-1.5">Study help</span><span className="rounded-full bg-secondary px-3 py-1.5">Progress</span></div></div>
          <div className="mb-3 flex items-center gap-1 rounded-xl border border-border/60 bg-card/40 p-1"><button onClick={()=>setFeedMode("latest")} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-semibold",feedMode==="latest"&&"bg-background shadow-sm")}>Latest</button><button onClick={()=>setFeedMode("popular")} className={cn("flex-1 rounded-lg px-3 py-2 text-sm font-semibold",feedMode==="popular"&&"bg-background shadow-sm")}>Popular</button></div>
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
                    <article key={message.id} className="group flex gap-3 rounded-2xl border border-border/70 bg-card/65 p-4 shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
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
                        <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-6">{message.body}</p>
                        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2">
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

          <form onSubmit={handleSend} className="mt-3 rounded-2xl border border-border/70 bg-card/65 p-3 shadow-sm">
            <Label htmlFor="communityMessage" className="sr-only">Your message</Label>
            <div className="rounded-xl border border-border bg-card/40 p-2 focus-within:border-primary/60">
              <Textarea
                id="communityMessage"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={displayName ? `Post to ${title}…` : "Choose your display name to join"}
                disabled={!displayName}
                maxLength={1000}
                rows={2}
                className="min-h-12 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void handleSend(event as unknown as React.FormEvent);
                  }
                }}
              />
              <div className="flex items-center justify-between gap-3 border-t border-border/50 px-1 pt-2">
                <span className="text-[11px] tabular-nums text-muted-foreground">{draft.length}/1000</span>
                <Button type="submit" size="sm" disabled={!displayName || sending || draft.trim().length === 0}><Send className="size-4" aria-hidden />{sending ? "Posting" : "Post"}</Button>
              </div>
            </div>
          </form>
        </section>

        <aside className="hidden space-y-4 xl:block">
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm"><div className="flex items-center gap-2"><Sparkles className="size-4 text-primary"/><h3 className="font-semibold">Welcome to IT PATH</h3></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">A community built around learning, troubleshooting, certifications and helping each other move forward.</p></div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm"><h3 className="font-semibold">Popular communities</h3><div className="mt-3 space-y-2">{rooms.slice(1,6).map((entry,i)=><button key={entry.id} onClick={()=>void navigate({search:{room:entry.id}})} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-secondary/60"><div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary">#{i+1}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{entry.label}</p><p className="text-xs text-muted-foreground">Study community</p></div></button>)}</div></div>
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground"><p className="font-semibold text-foreground">Community standards</p><p className="mt-2">Learn openly. Help when you can. Disagree respectfully. Report content that crosses the line.</p></div>
        </aside>
      </div>
    </>
  );
}

function SocialNav({icon,label,active,onClick}:{icon:React.ReactNode;label:string;active?:boolean;onClick?:()=>void}){return <button onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-secondary/70",active&&"bg-primary/10 text-primary")}>{icon}{label}</button>}

function SocialHero() {
  return <header className="mb-5 flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">IT PATH Network</p><h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Community</h1><p className="mt-1 text-sm text-muted-foreground">Learn together. Ask questions. Share progress. Build your network.</p></div><div className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><Input className="rounded-full pl-9" placeholder="Search community"/></div></header>
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
