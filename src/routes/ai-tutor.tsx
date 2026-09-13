import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, History, Loader2, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { ProGate } from "@/components/pro-gate";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { askTutor } from "@/lib/tutor.functions";
import { knowledgeDigest } from "@/lib/knowledge-context";
import { useKnowledge } from "@/hooks/use-knowledge";
import {
  clearTutorThreads,
  deleteTutorThread,
  getTutorThread,
  listTutorThreads,
  saveTutorThread,
  type TutorThreadSummary,
} from "@/lib/tutor-threads.functions";
import {
  generateTutorPrompt,
  tutorModes,
  tutorTopicOptions,
  type TutorMode,
} from "@/lib/tutor-prompts";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/ai-tutor")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "AI Tutor — IT PATH" },
      {
        name: "description",
        content:
          "A built-in AI tutor that teaches, quizzes and drills you using your real progress, mistakes and reviews as context.",
      },
      { property: "og:title", content: "AI Tutor — IT PATH" },
      {
        property: "og:description",
        content: "Get tutoring built on your actual study records — weak areas, mistakes and review history included.",
      },
    ],
  }),
  component: AiTutorGated,
});

function AiTutorGated() {
  return (
    <ProGate feature="The AI Tutor">
      <AiTutor />
    </ProGate>
  );
}

const NO_TOPIC = "__none__";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the manual fallback below
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

function AiTutor() {
  const { user } = useAppState();
  const [mode, setMode] = useState<TutorMode>("teach_me");
  const [topicId, setTopicId] = useState<string>(NO_TOPIC);
  const [answer, setAnswer] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<TutorThreadSummary[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);

  const { items: knowledgeItems } = useKnowledge();
  const listThreads = useServerFn(listTutorThreads);
  const loadThread = useServerFn(getTutorThread);
  const saveThread = useServerFn(saveTutorThread);
  const removeThread = useServerFn(deleteTutorThread);
  const clearThreads = useServerFn(clearTutorThreads);

  const activeMode = tutorModes.find((m) => m.id === mode)!;
  const started = messages.length > 0;

  const refreshHistory = useCallback(async () => {
    const reply = await listThreads({});
    if (reply.ok) setThreads(reply.threads);
  }, [listThreads]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  async function persist(next: ChatMessage[]) {
    const topicTitle =
      topicId === NO_TOPIC
        ? "Weakest areas"
        : (tutorTopicOptions.find((t) => t.id === topicId)?.title ?? "General");
    const reply = await saveThread({
      data: {
        ...(threadId ? { id: threadId } : {}),
        title: `${activeMode.label} — ${topicTitle}`,
        mode,
        ...(topicId === NO_TOPIC ? {} : { topicId }),
        messages: next,
      },
    });
    if (reply.ok) {
      if (!threadId) setThreadId(reply.id);
      void refreshHistory();
    }
  }

  async function send(next: ChatMessage[]) {
    setBusy(true);
    const digest = knowledgeDigest(knowledgeItems, topicId === NO_TOPIC ? undefined : topicId);
    const reply = await askTutor({
      data: { messages: next, ...(digest ? { knowledge: digest } : {}) },
    });
    setBusy(false);
    if (reply.ok) {
      const updated = [...next, { role: "assistant" as const, content: reply.answer }];
      setMessages(updated);
      void persist(updated);
    } else {
      setMessages(next);
      toast.error(reply.error);
    }
  }

  async function start() {
    if (mode === "review_answer" && !answer.trim()) {
      toast.error("Paste the answer you want reviewed first.");
      return;
    }
    const prompt = generateTutorPrompt(user, mode, {
      ...(topicId === NO_TOPIC ? {} : { topicId }),
      learnerAnswer: answer,
    });
    await send([{ role: "user", content: prompt }]);
  }

  async function reply() {
    const text = followUp.trim();
    if (!text) return;
    setFollowUp("");
    await send([...messages, { role: "user", content: text }]);
  }

  function newChat() {
    setMessages([]);
    setFollowUp("");
    setAnswer("");
    setThreadId(null);
  }

  async function openThread(id: string) {
    setHistoryBusy(true);
    const reply = await loadThread({ data: { id } });
    setHistoryBusy(false);
    if (!reply.ok) {
      toast.error(reply.error);
      void refreshHistory();
      return;
    }
    setThreadId(reply.thread.id);
    setMessages(reply.thread.messages);
    setFollowUp("");
    if (reply.thread.mode && tutorModes.some((m) => m.id === reply.thread.mode)) {
      setMode(reply.thread.mode as TutorMode);
    }
    setTopicId(reply.thread.topicId ?? NO_TOPIC);
  }

  async function dropThread(id: string) {
    const reply = await removeThread({ data: { id } });
    if (!reply.ok) {
      toast.error(reply.error);
      return;
    }
    if (threadId === id) newChat();
    void refreshHistory();
  }

  async function clearHistory() {
    const reply = await clearThreads({});
    if (!reply.ok) {
      toast.error(reply.error);
      return;
    }
    setThreads([]);
    if (threadId) newChat();
    toast.success("Tutor history cleared.");
  }

  async function copyPrompt() {
    const first = messages[0];
    if (!first) return;
    const ok = await copyText(first.content);
    if (ok) toast.success("Prompt copied to your clipboard.");
    else toast.error("Copying was blocked. Select the text and copy it manually.");
  }

  return (
    <>
      <PageHeader
        title="AI Tutor"
        description="A built-in tutor that answers here in the app. It starts every session from your real progress, mistakes and reviews — pick a mode and a topic, then ask."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
        <Panel title="Set up the session">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tutor-mode">Mode</Label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as TutorMode)}
                disabled={started}
              >
                <SelectTrigger id="tutor-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tutorModes.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{activeMode.description}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tutor-topic">Topic</Label>
              <Select value={topicId} onValueChange={setTopicId} disabled={started}>
                <SelectTrigger id="tutor-topic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TOPIC}>My weakest areas</SelectItem>
                  {tutorTopicOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === "review_answer" && !started ? (
              <div className="grid gap-2">
                <Label htmlFor="tutor-answer">Your answer</Label>
                <Textarea
                  id="tutor-answer"
                  rows={6}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Paste the answer you want reviewed."
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {!started ? (
                <Button onClick={start} disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Sparkles className="size-4" aria-hidden />
                  )}
                  Ask the tutor
                </Button>
              ) : (
                <Button variant="secondary" onClick={newChat} disabled={busy}>
                  <Plus className="size-4" aria-hidden />
                  New chat
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Prefer your own assistant? Start a session, then copy the generated prompt — it
              contains the same context the built-in tutor receives.
            </p>
          </div>
        </Panel>

        <Panel
          title="Past conversations"
          description="Chats save to your account automatically and are kept for 30 days."
        >
          {threads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing saved yet. Your tutor chats will appear here as you have them.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-border rounded-md border border-border">
                {threads.map((thread) => (
                  <li
                    key={thread.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2.5"
                  >
                    <button
                      type="button"
                      className="min-w-0 text-left"
                      disabled={historyBusy}
                      onClick={() => void openThread(thread.id)}
                    >
                      <p className="truncate text-sm font-medium">{thread.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(thread.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {thread.messageCount - 1}{" "}
                        {thread.messageCount - 1 === 1 ? "message" : "messages"}
                      </p>
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${thread.title}`}
                      onClick={() => void dropThread(thread.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => void clearHistory()}
              >
                <History className="size-4" aria-hidden />
                Clear history
              </Button>
            </>
          )}
        </Panel>
        </div>

        <Panel
          title="Session"
          description={
            started
              ? "Reply below to keep going — quiz answers, diagnoses and interview responses all go in the same box."
              : "The tutor's reply will appear here, built on your recorded progress and weak areas."
          }
        >
          {started ? (
            <div className="grid gap-4">
              <div className="grid max-h-[32rem] gap-3 overflow-y-auto pr-1">
                {messages.slice(1).map((m, i) =>
                  m.role === "assistant" ? (
                    <div key={i} className="rounded-lg border border-border bg-secondary/40 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Tutor
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                    </div>
                  ) : (
                    <div key={i} className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        You
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                    </div>
                  ),
                )}
                {busy ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    The tutor is thinking…
                  </div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tutor-followup">Your reply</Label>
                <Textarea
                  id="tutor-followup"
                  rows={4}
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="Answer the tutor's question, or ask for clarification…"
                  disabled={busy}
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={reply} disabled={busy || !followUp.trim()}>
                    <Send className="size-4" aria-hidden />
                    Send
                  </Button>
                  <Button variant="outline" onClick={copyPrompt} disabled={busy}>
                    <Copy className="size-4" aria-hidden />
                    Copy starting prompt
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose a mode and a topic, then press “Ask the tutor”. The session opens with your
              objectives, measured progress, weak areas, unresolved mistakes and review history
              already included — so answers are about what you actually need, not a generic lesson.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
