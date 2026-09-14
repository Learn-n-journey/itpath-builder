import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadFile } from "@/lib/portfolio-engine";
import {
  buildBackup,
  buildStudyRecord,
  readBackup,
  recordAsText,
  recordWithPortfolio,
} from "@/lib/record-engine";
import { useAppState } from "@/state/app-state";

export const Route = createFileRoute("/record")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Study record and backup — IT PATH" },
      {
        name: "description",
        content:
          "Download a transcript of everything you have studied in IT PATH, export your portfolio, and back up or restore your progress.",
      },
      { property: "og:title", content: "Study record and backup — IT PATH" },
      {
        property: "og:description",
        content:
          "A transcript of recorded study, certification readiness and evidenced skills, plus a full progress backup file.",
      },
    ],
  }),
  component: RecordPage,
});

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function RecordPage() {
  const { user, updateUser } = useAppState();
  const [name, setName] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const record = useMemo(() => buildStudyRecord(user), [user]);
  const learner = name.trim() || undefined;
  const transcript = useMemo(() => recordAsText(record, learner), [record, learner]);

  function exportTranscript() {
    downloadFile(`it-path-record-${stamp()}.txt`, transcript, "text/plain");
    toast.success("Study record downloaded");
  }

  function exportFull() {
    downloadFile(
      `it-path-record-portfolio-${stamp()}.txt`,
      recordWithPortfolio(record, user, learner),
      "text/plain",
    );
    toast.success("Record and portfolio downloaded");
  }

  function exportBackup() {
    downloadFile(`it-path-backup-${stamp()}.json`, buildBackup(user), "application/json");
    toast.success("Backup file downloaded");
  }

  async function restore(file: File) {
    const result = readBackup(await file.text());
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    updateUser(() => result.user);
    toast.success("Progress restored from backup");
  }

  const t = record.totals;

  return (
    <>
      <PageHeader
        title="Study record"
        description="A transcript of everything you have actually recorded, ready to download, plus a backup of your progress."
        actions={
          <Button asChild variant="secondary">
            <Link to="/">Back to dashboard</Link>
          </Button>
        }
      />

      {!record.hasActivity ? (
        <Panel className="mb-6">
          <p className="text-sm text-muted-foreground">
            Nothing is recorded yet, so the record is empty. Study a topic, take a quiz or finish a
            lab and it fills in with real figures.
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Transcript preview" description="Exactly what the downloaded file contains.">
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg bg-secondary/40 p-4 text-xs leading-relaxed text-muted-foreground">
            {transcript}
          </pre>
        </Panel>

        <div className="grid gap-6 content-start">
          <Panel title="Your name" description="Optional. Added to the top of the record.">
            <Label htmlFor="record-name" className="sr-only">
              Name on the record
            </Label>
            <Input
              id="record-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. David Boley"
            />
          </Panel>

          <Panel title="Download">
            <div className="grid gap-2">
              <Button onClick={exportTranscript}>
                <Download className="mr-2 size-4" /> Study record (.txt)
              </Button>
              <Button variant="secondary" onClick={exportFull} disabled={!user.portfolio.length}>
                <Download className="mr-2 size-4" /> Record + portfolio
              </Button>
              <Button variant="secondary" onClick={exportBackup}>
                <Download className="mr-2 size-4" /> Full backup (.json)
              </Button>
            </div>
            {!user.portfolio.length ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Write up a project in Portfolio to include it in the combined export.
              </p>
            ) : null}
          </Panel>

          <Panel
            title="Restore a backup"
            description="Replaces the progress in this browser with the contents of the file."
          >
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void restore(file);
              }}
            />
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              <Upload className="mr-2 size-4" /> Choose backup file
            </Button>
          </Panel>

          <Panel title="At a glance">
            <dl className="grid gap-2 text-sm">
              <Row label="Study time" value={`${Math.floor(t.studyMinutes / 60)}h ${t.studyMinutes % 60}m`} />
              <Row label="Topics started" value={`${t.topicsStarted} of ${t.topicsTotal}`} />
              <Row label="Quiz average" value={`${t.quizAverage}%`} />
              <Row label="Labs completed" value={String(t.labsCompleted)} />
              <Row label="Practice completed" value={String(t.practiceCompleted)} />
              <Row label="Portfolio projects" value={String(t.portfolioProjects)} />
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
