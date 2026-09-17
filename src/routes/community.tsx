import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, MessagesSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/state/auth-state";
import { useCommunityChat } from "@/hooks/use-community-chat";
import { useDisplayName } from "@/hooks/use-display-name";
import { checkDisplayName, checkMessage } from "@/lib/community/word-filter";

export const Route = createFileRoute("/community")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Community Chat | IT PATH" },
      {
        name: "description",
        content:
          "Talk with other IT PATH learners in one shared room: ask for help, share wins and compare notes on certification study.",
      },
      { property: "og:title", content: "Community Chat | IT PATH" },
      {
        property: "og:description",
        content: "One shared room for IT PATH learners to ask questions and share study wins.",
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
  const { displayName, loading: nameLoading, saveDisplayName, saving } = useDisplayName();
  const { messages, loading, send, sending, remove, report } = useCommunityChat();
  const [draft, setDraft] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const needsName = ready && Boolean(userId) && !nameLoading && !displayName;
  const grouped = useMemo(() => messages, [messages]);

  if (ready && !userId) {
    return (
      <>
        <PageHeader
          title="Community chat"
          description="One shared room for IT PATH learners."
        />
        <Panel title="Sign in to join" description="The chat is for people with an IT PATH account.">
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
        title="Community chat"
        description="One shared room for everyone studying with IT PATH. Ask for help, share a win, compare notes."
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
        title="The room"
        description={
          displayName ? `Posting as ${displayName}.` : "Set a name above before posting."
        }
      >
        <div className="mb-3 flex justify-end">
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
          ) : grouped.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
              <MessagesSquare className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Nothing here yet. Say hello and get it started.
              </p>
            </div>
          ) : (
            grouped.map((message) => {
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
    </div>
  );
}
