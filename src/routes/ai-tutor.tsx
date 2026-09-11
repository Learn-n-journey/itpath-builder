import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/ai-tutor")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "AI Tutor — IT PATH" },
      { name: "description", content: "Keep a running list of the questions you need answered." },
      { property: "og:title", content: "AI Tutor — IT PATH" },
      { property: "og:description", content: "Capture study questions and get them answered." },
    ],
  }),
  component: AiTutor,
});

const QUESTION_TAG = "Tutor question";

function AiTutor() {
  const { user, actions } = useAppState();
  const [text, setText] = useState("");
  const questions = user.notes.filter((n) => n.title === QUESTION_TAG);

  function addQuestion() {
    if (!text.trim()) {
      toast.error("Type your question first.");
      return;
    }
    const now = new Date().toISOString();
    actions.addNote({
      id: crypto.randomUUID(),
      title: QUESTION_TAG,
      body: text.trim(),
      createdAt: now,
      updatedAt: now,
    });
    setText("");
    toast.success("Question saved to your list.");
  }

  return (
    <>
      <PageHeader
        title="AI Tutor"
        description="Every question you save here is kept on your device and answered by the tutor once it is switched on."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Ask a question">
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Why does a device with a 169.254.x.x address have no network access?"
          />
          <Button className="mt-3" onClick={addQuestion}>
            Save question
          </Button>
        </Panel>
        <Panel title={`Your questions (${questions.length})`}>
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions saved yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {questions.map((q) => (
                <li key={q.id} className="flex min-w-0 items-start justify-between gap-4 py-3">
                  <p className="min-w-0 break-words text-sm">{q.body}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove question"
                    onClick={() => actions.removeNote(q.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
