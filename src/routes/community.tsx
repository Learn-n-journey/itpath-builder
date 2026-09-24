import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
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
  const { messages, loading, send, sending, remove, report } = useCommunityChat(room);
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

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, room]);

  const needsName = ready && Boolean(userId) && !nameLoading && !displayName;
  const sectionId = topicForRoom(room);
  const title = roomTitle(room);

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
      <CommunityHero />

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

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {rooms.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => void navigate({ search: { room: entry.id } })}
            className={cn(
              "flex min-w-[9rem] shrink-0 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
              entry.id === room ? "border-primary bg-primary/10 text-foreground" : "border-border/70 bg-card/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", entry.id === room ? "bg-primary text-primary-foreground" : "bg-secondary")}>
              {entry.id === GENERAL_ROOM ? <Users className="size-4" aria-hidden /> : <Hash className="size-4" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{entry.label}</span>
              <span className="block text-[11px] opacity-70">{entry.id === GENERAL_ROOM ? "Public room" : "Study room"}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_16rem]">
        <aside className="hidden xl:block">
          <div className="sticky top-4 space-y-4 rounded-xl border border-border/70 bg-card/25 p-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {sectionId ? <Hash className="size-6" aria-hidden /> : <Users className="size-6" aria-hidden />}
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{sectionId ? "Topic study room" : "Public room"}</p>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {sectionId ? "Discuss this topic, compare notes, ask questions, and help other learners work through it." : "Talk about your IT PATH journey, ask questions, share wins, and help other learners."}
            </p>
            {sectionId ? <Button asChild variant="secondary" className="w-full"><Link to="/topics/$topicId" params={{ topicId: sectionId }}><BookOpen className="size-4" aria-hidden />Open topic</Link></Button> : null}
            <div className="border-t border-border/70 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Room rules</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />Be respectful and supportive.</p>
                <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />Keep it about studying and IT.</p>
                <p className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />Help others when you can.</p>
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/20">
          <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
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

          <div ref={listRef} className="h-[55vh] min-h-[28rem] overflow-y-auto p-3 sm:p-4">
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
                {messages.map((message) => {
                  const mine = message.userId === userId;
                  const shownName = mine ? displayName || "You" : message.displayName;
                  const initial = shownName.trim().charAt(0).toUpperCase() || "?";
                  return (
                    <article key={message.id} className={cn("group flex gap-3 rounded-xl border p-3 transition-colors", mine ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background/25 hover:bg-secondary/25")}>
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
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-border/70 bg-background/30 p-3">
            <Label htmlFor="communityMessage" className="sr-only">Your message</Label>
            <div className="rounded-xl border border-border bg-card/40 p-2 focus-within:border-primary/60">
              <Textarea
                id="communityMessage"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={displayName ? "Type a message..." : "Choose your display name to join"}
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
                <Button type="submit" size="sm" disabled={!displayName || sending || draft.trim().length === 0}><Send className="size-4" aria-hidden />{sending ? "Sending" : "Send"}</Button>
              </div>
            </div>
          </form>
        </section>

        <aside className="hidden space-y-4 xl:block">
          <div className="rounded-xl border border-border/70 bg-card/25 p-4">
            <div className="flex items-center gap-2"><Users className="size-4 text-primary" aria-hidden /><h3 className="text-sm font-semibold">Community</h3></div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Study rooms stay focused on the material so useful conversations are easier to find.</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/25 p-4">
            <div className="flex items-center gap-2"><Bell className="size-4 text-primary" aria-hidden /><h3 className="text-sm font-semibold">Quick actions</h3></div>
            <div className="mt-3 space-y-1">
              {sectionId ? <Button asChild variant="ghost" className="w-full justify-start"><Link to="/topics/$topicId" params={{ topicId: sectionId }}><BookOpen className="size-4" aria-hidden />Open this topic</Link></Button> : null}
              {displayName && !editingName ? <Button type="button" variant="ghost" className="w-full justify-start" onClick={() => setEditingName(true)}><Pencil className="size-4" aria-hidden />Change display name</Button> : null}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
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
