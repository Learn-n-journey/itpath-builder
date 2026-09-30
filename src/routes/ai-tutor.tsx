import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Copy, History, Loader2, Plus, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { ContentReportButton } from "@/components/content-report-button";

export const Route = createFileRoute("/ai-tutor")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Ask GAYL | IT PATH" },
      {
        name: "description",
        content:
          "A built-in AI tutor that teaches, quizzes and drills you using your real progress, mistakes and reviews as context.",
      },
      { property: "og:title", content: "Ask GAYL | IT PATH" },
      {
        property: "og:description",
        content: "Get tutoring built on your actual study records, weak areas, mistakes and review history included.",
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
  const [mode, setMode] = useState<TutorMode>("ask_anything");
  const [topicId, setTopicId] = useState<string>(NO_TOPIC);
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<TutorThreadSummary[]>([]);
  const [historyBusy, setHistoryBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!started && !busy) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy, started]);

  async function persist(next: ChatMessage[]) {
    const topicTitle =
      topicId === NO_TOPIC
        ? "Weakest areas"
        : (tutorTopicOptions.find((t) => t.id === topicId)?.title ?? "General");
    const reply = await saveThread({
      data: {
        ...(threadId ? { id: threadId } : {}),
        title: `${activeMode.label}, ${topicTitle}`,
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
      const paragraphs = reply.answer.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
      let visibleAnswer = "";
      for (const paragraph of paragraphs.length ? paragraphs : [reply.answer]) {
        visibleAnswer = visibleAnswer ? `${visibleAnswer}\n\n${paragraph}` : paragraph;
        setMessages([...next, { role: "assistant" as const, content: visibleAnswer }]);
        await new Promise((resolve) => window.setTimeout(resolve, 300));
      }
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
    if (mode === "ask_anything" && !question.trim()) {
      toast.error("Type your question first.");
      return;
    }
    const prompt = generateTutorPrompt(user, mode, {
      ...(topicId === NO_TOPIC ? {} : { topicId }),
      learnerAnswer: answer,
      question,
    });
    const initial = [{ role: "user" as const, content: prompt }];
    setMessages(initial);
    await send(initial);
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
    setQuestion("");
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
      <header className="relative mb-4 overflow-hidden rounded-2xl border border-border/70 bg-card/30 px-5 py-6 sm:px-6">
        <div className="absolute inset-x-0 top-0 h-px bg-primary/70" />
        <div className="relative flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Bot className="size-6" aria-hidden /></div>
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Learning workspace</p><h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Ask GAYL</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ask questions, practice ideas, and work through problems with your progress and saved material in context.</p></div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
        <Panel title="GAYL controls" description="Choose how you want GAYL to help, then start the conversation.">
          <div className="mb-4 grid gap-2">
            <Label htmlFor="gayl-action">How should GAYL help?</Label>
            <Select
              defaultValue="explain"
              disabled={started}
              onValueChange={(value) => {
                setMode("ask_anything");
                if (value === "explain") setQuestion("");
                if (value === "practice") setQuestion("Give me practice on this topic and explain my mistakes.");
                if (value === "apply") setQuestion("Show me how this appears in a real IT job or troubleshooting situation.");
                if (value === "review") setQuestion("Help me review this topic and find what I do not understand yet.");
              }}
            >
              <SelectTrigger id="gayl-action">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="explain">Explain — Clear explanations</SelectItem>
                <SelectItem value="practice">Practice — Work through it</SelectItem>
                <SelectItem value="apply">Apply — Real-world scenario</SelectItem>
                <SelectItem value="review">Review — Check understanding</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

            {started ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={newChat} disabled={busy}>
                  <Plus className="size-4" aria-hidden />
                  New chat
                </Button>
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Prefer your own assistant? Start a session, then copy the generated prompt, it
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
              Nothing saved yet. Your GAYL chats will appear here as you have them.
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
              ? "Reply below to keep going, quiz answers, diagnoses and interview responses all go in the same box."
              : "GAYL's reply will appear here, built on your recorded progress and weak areas."
          }
        >
          {started ? (
            <div className="grid gap-4">
              <div className="grid min-h-[28rem] max-h-[56vh] gap-3 overflow-y-auto pr-1">
                {messages.slice(1).map((m, i) =>
                  m.role === "assistant" ? (
                    <div key={i} className="flex max-w-[94%] items-start gap-3">
                      <img
                        src="/ChatGPT%20Image%20Sep%2027%2C%202026%2C%2011_22_22%20PM.png"
                        alt="GAYL"
                        className="size-11 shrink-0 rounded-full border border-primary/30 object-cover"
                      />
                      <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-secondary/30 p-4">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        GAYL
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
                      <ContentReportButton
                        kind="ai_answer"
                        refId={`tutor-${i}`}
                        label={m.content.slice(0, 200)}
                        className="mt-2"
                      />
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="ml-auto max-w-[85%] rounded-xl border border-primary/30 bg-primary px-4 py-3 text-primary-foreground">
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
                    GAYL is thinking…
                  </div>
                ) : null}
                <div ref={chatEndRef} aria-hidden />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tutor-followup">Your reply</Label>
                <Textarea
                  id="tutor-followup"
                  rows={4}
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  placeholder="Answer GAYL's question, or ask for clarification…"
                  disabled={busy}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!busy && followUp.trim()) void reply();
                    }
                  }}
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
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/ChatGPT%20Image%20Sep%2027%2C%202026%2C%2011_22_22%20PM.png"
                  alt="GAYL"
                  className="size-12 rounded-full border border-primary/30 object-cover"
                />
                <p className="text-sm text-muted-foreground">
                  Choose how you want help and an optional topic, then ask GAYL below.
                </p>
              </div>
              <Textarea
                id="gayl-message"
                rows={4}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask GAYL anything…"
                disabled={busy}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (!busy && question.trim()) void start();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Enter to send · Shift + Enter for a new line</p>
                <Button onClick={start} disabled={busy || (mode === "ask_anything" && !question.trim())}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
                  Send
                </Button>
              </div>
              {busy ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  GAYL is thinking…
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
