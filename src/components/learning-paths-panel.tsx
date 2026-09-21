/**
 * Owner-only panel for creating a new learning path.
 *
 * Creating one gives a blank course with the same architecture as the built-in
 * courses — sections, lessons, topic quizzes, a final exam and optional labs —
 * and none of the games or tools that belong to a particular subject. Its
 * material comes from a folder named "<name> path" holding the usual
 * lessons / try it / quiz / labs sub-folders.
 */
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setDomainOverride } from "@/lib/active-domain";
import {
  createLearningPath,
  setLearningPathVisible,
} from "@/lib/learning-paths.functions";
import {
  learningPaths,
  loadLearningPaths,
  rememberLearningPaths,
} from "@/lib/learning-path-store";
import { pathFolder, pathKey, type LearningPath } from "@/lib/learning-paths-shared";
import { syncNow } from "@/lib/sheet-sync.functions";

export function LearningPathsPanel() {
  const create = useServerFn(createLearningPath);
  const setVisible = useServerFn(setLearningPathVisible);
  const runSync = useServerFn(syncNow);

  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [name, setName] = useState("");
  const [sections, setSections] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setPaths(learningPaths());
    void loadLearningPaths().then(setPaths);
  }, []);

  const titles = sections
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  async function handleCreate() {
    if (name.trim().length < 2) {
      toast.error("Give the path a name first.");
      return;
    }
    if (titles.length === 0) {
      toast.error("Add at least one section title, one per line.");
      return;
    }
    setBusy("create");
    try {
      const result = await create({ data: { name: name.trim(), topics: titles } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      rememberLearningPaths(result.paths);
      setPaths(result.paths);
      setName("");
      setSections("");
      toast.success(`Created. Add your spreadsheets to “${pathFolder(name)}”.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not save.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleVisible(path: LearningPath) {
    setBusy(path.slug);
    try {
      const result = await setVisible({ data: { slug: path.slug, visible: !path.visible } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      rememberLearningPaths(result.paths);
      setPaths(result.paths);
      toast.success(path.visible ? "Hidden from learners." : "Now visible to everyone.");
    } finally {
      setBusy(null);
    }
  }

  async function syncPath(path: LearningPath) {
    setBusy(`sync-${path.slug}`);
    try {
      const result = await runSync({ data: { scope: path.slug } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Synced: ${result.lessonsApproved} lesson(s), ${result.approved} question(s), ${result.workTopics} try-it/lab section(s).`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The sync failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel
      className="mt-4"
      title="Learning paths"
      description="Create a brand new course. It starts empty and reads its own spreadsheet folder, with no games or tools from the other courses."
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="path-name">Path name</Label>
          <Input
            id="path-name"
            className="mt-1.5"
            placeholder="Writing"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {name.trim()
              ? `Its folder will be “${pathFolder(name)}”, with lessons, try it, quiz and labs inside.`
              : "The folder is always the name followed by “path”, for example “writing path”."}
          </p>
        </div>

        <div>
          <Label htmlFor="path-sections">Section titles, one per line</Label>
          <Textarea
            id="path-sections"
            className="mt-1.5 min-h-40"
            placeholder={"Sentences that work\nParagraph shape\nEditing your own writing"}
            value={sections}
            onChange={(event) => setSections(event.target.value)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {titles.length} section{titles.length === 1 ? "" : "s"}. The first line is section 1, so
            its workbook is 1.xlsx. You can add more later.
          </p>
        </div>

        <Button onClick={handleCreate} disabled={busy !== null}>
          {busy === "create" ? "Creating…" : "Create learning path"}
        </Button>
      </div>

      {paths.length ? (
        <div className="mt-6 space-y-3 border-t border-border pt-4">
          {paths.map((path) => (
            <div
              key={path.slug}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <p className="text-sm font-medium">{path.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Folder “{path.folder}” · {path.topics.length} section
                {path.topics.length === 1 ? "" : "s"} ·{" "}
                {path.visible ? "visible to everyone" : "only you can see it"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => {
                    setDomainOverride(pathKey(path.slug));
                    window.location.assign("/dashboard");
                  }}
                >
                  Open this path
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => syncPath(path)}
                >
                  {busy === `sync-${path.slug}` ? "Syncing…" : "Sync its spreadsheets"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => toggleVisible(path)}
                >
                  {path.visible ? "Hide from learners" : "Show to everyone"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
