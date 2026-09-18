/**
 * Small "Report a problem" control placed beside lesson sections, quiz
 * questions and AI answers. One click, pick a reason, optional note.
 */
import { Flag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { REPORT_REASONS, reportContentProblem } from "@/lib/content-reports.functions";

interface Props {
  kind: "lesson" | "question" | "ai_answer";
  refId: string;
  label?: string;
  className?: string;
}

export function ContentReportButton({ kind, refId, label, className }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return <p className={`text-xs text-muted-foreground ${className ?? ""}`}>Thanks, I have logged that.</p>;
  }

  const send = async () => {
    setSending(true);
    try {
      const reply = await reportContentProblem({
        data: { kind, refId, reason, ...(label ? { label } : {}), ...(note.trim() ? { note: note.trim() } : {}) },
      });
      if (reply.ok) {
        setSent(true);
        setOpen(false);
      } else {
        toast.error(reply.error);
      }
    } catch {
      toast.error("Could not send that report, try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={className}>
      {open ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium">What looks wrong here?</p>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          >
            {REPORT_REASONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Anything else worth knowing (optional)"
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void send()} disabled={sending}>
              {sending ? "Sending…" : "Send report"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Flag className="h-3 w-3" aria-hidden />
          Report a problem
        </button>
      )}
    </div>
  );
}
