import { createFileRoute } from "@tanstack/react-router";
import { Copy, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
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
      { title: "AI Tutor Prompts — IT PATH" },
      {
        name: "description",
        content:
          "Generate a tutoring prompt built from your own study records, then copy it into the AI assistant of your choice.",
      },
      { property: "og:title", content: "AI Tutor Prompts — IT PATH" },
      {
        property: "og:description",
        content: "Build context-aware study prompts from your real progress, mistakes and reviews.",
      },
    ],
  }),
  component: AiTutor,
});

const NO_TOPIC = "__none__";

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
  const [prompt, setPrompt] = useState("");

  const activeMode = tutorModes.find((m) => m.id === mode)!;

  function generate() {
    const text = generateTutorPrompt(user, mode, {
      ...(topicId === NO_TOPIC ? {} : { topicId }),
      learnerAnswer: answer,
    });
    setPrompt(text);
    toast.success("Prompt generated. Copy it into your AI assistant.");
  }

  async function copy() {
    if (!prompt) {
      toast.error("Generate a prompt first.");
      return;
    }
    const ok = await copyText(prompt);
    if (ok) toast.success("Prompt copied to your clipboard.");
    else toast.error("Copying was blocked. Select the prompt text and copy it manually.");
  }

  return (
    <>
      <PageHeader
        title="AI Tutor"
        description="IT PATH does not answer questions itself. It builds a detailed prompt from your real progress, mistakes and reviews, which you copy into the AI assistant you already use."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <Panel title="Build your prompt">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tutor-mode">Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as TutorMode)}>
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
              <Select value={topicId} onValueChange={setTopicId}>
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

            {mode === "review_answer" ? (
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

            <Button onClick={generate}>
              <Sparkles className="size-4" aria-hidden />
              Generate AI prompt
            </Button>
          </div>
        </Panel>

        <Panel
          title="Your prompt"
          description="Nothing is sent anywhere. No answer is generated here — the assistant you paste this into produces the response."
        >
          {prompt ? (
            <div className="grid gap-3">
              <Textarea
                aria-label="Generated prompt"
                readOnly
                value={prompt}
                rows={20}
                className="font-mono text-xs"
              />
              <div>
                <Button variant="secondary" onClick={copy}>
                  <Copy className="size-4" aria-hidden />
                  Copy prompt
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose a mode and a topic, then generate a prompt. It will include your objectives,
              measured progress, weak areas, unresolved mistakes and review history.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
