import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, Hash, MessagesSquare, Pencil, Send, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
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

export const Route = createFileRoute("/community")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>) => ({
    room: typeof search["room"] === "string" ? search["room"] : GENERAL_ROOM,
  }),
  head: () => ({
    meta: [
      { title: "Community and study rooms | IT PATH" },
      {
        name: "description",
        content:
          "Talk with other IT PATH learners in the general room or in a study room for the section you are working on right now.",
      },
      { property: "og:title", content: "Community and study rooms | IT PATH" },
      {
        property: "og:description",
        content: "General chat plus a study room for every section of the curriculum.",
      },
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
    const ordered = current
      ? [current, ...sections.filter((topic) => topic.id !== current.id)]
      : sections;
    return [
      { id: GENERAL_ROOM, label: "General" },
      ...ordered.map((topic) => ({ id: topic.id, label: topic.title })),
    ];
  }, [user]);

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName]);

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
        <PageHeader
          title="Community and study rooms"
          description="A general room plus a study room for every section."
        />
        <Panel title="Sign in to join" description="The rooms are for people with an IT PATH account.">
          <Button asChild>
            <Link to="/auth">Sign in or create an account</Link>
          </Button>
        </Panel>
      </>
    );
  }

  async function handleName(event: React.FormEvent) {
    event.preventDefault();
    const problem = checkDisplayName(nameDraft);
    if (problem) {
      toast.error(problem);
      return;
    }
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
    if (problem) {
      toast.error(problem);
      return;
    }
    try {
      await send({ body: draft, displayName });
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not send.");
    }
  }

  return (
    <>
      <PageHeader
        title="Community and study rooms"
        description="Ask for help where it belongs: the general room for anything, a section room for the material you are on."
      />

      {needsName || editingName ? (
        <Panel
          title={displayName ? "Change your chat name" : "Pick your chat name"}
          description="This is the name other learners see next to your messages."
        >
          <form onSubmit={handleName} className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="communityName">Display name</Label>
              <Input
                id="communityName"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="For example, Dave B"
                maxLength={24}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving" : "Save name"}
            </Button>
            {displayName ? (
              <Button type="button" variant="ghost" onClick={() => setEditingName(false)}>
                Cancel
              </Button>
            ) : null}
          </form>
        </Panel>
      ) : null}

      <Panel
        title="Rooms"
        description="General chat, then one room for each section of your certificate."
        className="mb-6"
      >
        <div className="flex flex-wrap gap-2">
          {rooms.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => void navigate({ search: { room: entry.id } })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                entry.id === room
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </Panel>

      <Panel
        title={title}
        description={
          displayName ? `Posting as ${displayName}.` : "Set a name above before posting."
        }
      >
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          {sectionId ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/topics/$topicId" params={{ topicId: sectionId }}>
                Open this section
              </Link>
            </Button>
          ) : null}
          {displayName && !editingName ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingName(true)}>
              Change name
            </Button>
          ) : null}
        </div>

        <div
          ref={listRef}
          className="max-h-[52vh] min-h-[16rem] space-y-4 overflow-y-auto rounded-lg border border-border/70 bg-card/40 p-4"
        >
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading the room.</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
              {sectionId ? (
                <Users className="size-6 text-muted-foreground" aria-hidden />
              ) : (
                <MessagesSquare className="size-6 text-muted-foreground" aria-hidden />
              )}
              <p className="text-sm text-muted-foreground">
                {sectionId
                  ? `No messages about ${title} yet. Post the part you are stuck on and get it started.`
                  : "Nothing here yet. Say hello and get it started."}
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const mine = message.userId === userId;
              return (
                <div key={message.id} className="group flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className={mine ? "text-sm font-semibold text-primary" : "text-sm font-semibold"}>
                      {mine ? "You" : message.displayName}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeLabel(message.createdAt)}</span>
                    <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      {mine ? (
                        <button
                          type="button"
                          aria-label="Delete your message"
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                          onClick={async () => {
                            try {
                              await remove(message.id);
                            } catch {
                              toast.error("That did not delete. Try again.");
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-label="Report this message"
                          className="rounded p-1 text-muted-foreground hover:text-foreground"
                          onClick={async () => {
                            try {
                              await report({ messageId: message.id });
                              toast.success("Reported. Thank you for flagging it.");
                            } catch {
                              toast.error("That did not send. Try again.");
                            }
                          }}
                        >
                          <Flag className="size-3.5" aria-hidden />
                        </button>
                      )}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="mt-4 space-y-3">
          <Label htmlFor="communityMessage" className="sr-only">
            Your message
          </Label>
          <Textarea
            id="communityMessage"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={displayName ? "Write a message" : "Set your chat name first"}
            disabled={!displayName}
            maxLength={1000}
            rows={3}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void handleSend(event as unknown as React.FormEvent);
              }
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Be kind and keep it about studying. Abusive language is blocked.
            </p>
            <Button type="submit" disabled={!displayName || sending || draft.trim().length === 0}>
              <Send className="mr-2 size-4" aria-hidden />
              {sending ? "Sending" : "Send"}
            </Button>
          </div>
        </form>
      </Panel>
    </>
  );
}  return (
    <>
      <PageHeader
        title="Community"
        description="Talk, ask questions, and study alongside other IT PATH learners."
      />

      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/30">
            <div className="border-b border-border/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Study rooms</p>
              <p className="mt-1 text-sm text-muted-foreground">Jump into a conversation by topic.</p>
            </div>
            <nav className="max-h-[32rem] overflow-y-auto p-2" aria-label="Community rooms">
              {rooms.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => void navigate({ search: { room: entry.id } })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                    entry.id === room
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {entry.id === GENERAL_ROOM ? <Users className="size-4 shrink-0" aria-hidden /> : <Hash className="size-4 shrink-0" aria-hidden />}
                  <span className="truncate">{entry.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/20">
          <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {sectionId ? <Hash className="size-5 shrink-0 text-primary" aria-hidden /> : <Users className="size-5 shrink-0 text-primary" aria-hidden />}
                <h2 className="truncate font-display text-lg font-semibold">{title}</h2>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {sectionId ? "Topic study room" : "Open conversation for the IT PATH community"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {sectionId ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/topics/$topicId" params={{ topicId: sectionId }}>Open topic</Link>
                </Button>
              ) : null}
              {displayName && !editingName ? (
                <Button type="button" variant="ghost" size="icon" aria-label="Change display name" onClick={() => setEditingName(true)}>
                  <Pencil className="size-4" aria-hidden />
                </Button>
              ) : null}
            </div>
          </header>

          {needsName || editingName ? (
            <div className="border-b border-border/70 bg-secondary/20 p-4 sm:p-5">
              <form onSubmit={handleName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor="communityName">{displayName ? "Change display name" : "Choose your display name"}</Label>
                  <Input id="communityName" value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder="For example, Dave B" maxLength={24} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving ? "Saving" : "Save"}</Button>
                  {displayName ? <Button type="button" variant="ghost" onClick={() => setEditingName(false)}>Cancel</Button> : null}
                </div>
              </form>
            </div>
          ) : null}

          <div ref={listRef} className="h-[52vh] min-h-[24rem] overflow-y-auto px-4 py-5 sm:px-5">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading the room.</p>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-secondary">
                  <MessagesSquare className="size-5 text-muted-foreground" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold">{sectionId ? `Start the ${title} conversation` : "Welcome to General"}</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    {sectionId ? "Ask a question, share what you learned, or help someone working through the same topic." : "Say hello, ask for help, or share something useful with other learners."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {messages.map((message) => {
                  const mine = message.userId === userId;
                  const initial = (mine ? displayName : message.displayName).trim().charAt(0).toUpperCase() || "?";
                  return (
                    <article key={message.id} className="group flex gap-3 rounded-lg px-2 py-3 hover:bg-secondary/30">
                      <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold", mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground")}>
                        {initial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold">{mine ? "You" : message.displayName}</span>
                          <span className="text-xs text-muted-foreground">{timeLabel(message.createdAt)}</span>
                          <span className="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                            {mine ? (
                              <button type="button" aria-label="Delete your message" className="rounded p-1 text-muted-foreground hover:text-foreground" onClick={async () => { try { await remove(message.id); } catch { toast.error("That did not delete. Try again."); } }}>
                                <Trash2 className="size-3.5" aria-hidden />
                              </button>
                            ) : (
                              <button type="button" aria-label="Report this message" className="rounded p-1 text-muted-foreground hover:text-foreground" onClick={async () => { try { await report({ messageId: message.id }); toast.success("Reported. Thank you for flagging it."); } catch { toast.error("That did not send. Try again."); } }}>
                                <Flag className="size-3.5" aria-hidden />
                              </button>
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

          <form onSubmit={handleSend} className="border-t border-border/70 bg-background/40 p-3 sm:p-4">
            <Label htmlFor="communityMessage" className="sr-only">Your message</Label>
            <div className="flex items-end gap-2 rounded-xl border border-border bg-card/50 p-2 focus-within:border-primary/60">
              <Textarea
                id="communityMessage"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={displayName ? `Message ${title}` : "Choose your display name to join the conversation"}
                disabled={!displayName}
                maxLength={1000}
                rows={2}
                className="min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void handleSend(event as unknown as React.FormEvent);
                  }
                }}
              />
              <Button type="submit" size="icon" aria-label="Send message" disabled={!displayName || sending || draft.trim().length === 0}>
                <Send className="size-4" aria-hidden />
              </Button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 px-1">
              <p className="text-[11px] text-muted-foreground">Keep it helpful and study-focused.</p>
              {displayName ? <p className="text-[11px] text-muted-foreground">Posting as <span className="font-medium text-foreground">{displayName}</span></p> : null}
            </div>
          </form>
        </main>
      </div>
    </>
  );\n}\n