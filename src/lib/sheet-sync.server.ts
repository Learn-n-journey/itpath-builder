/**
 * Spreadsheet content sync, shared core.
 *
 * The owner's OneDrive holds one folder per course, each with the same four
 * sub-folders:
 *
 *   it path/lessons     the lesson text
 *   it path/try it      practice questions, recall, teach back, real world scenario
 *   it path/quiz        the topic quiz questions
 *   it path/labs        the numbered lab items
 *
 *   auto path/...       the same four, for the car course
 *
 * Every workbook is numbered: the leading number in the filename picks the
 * topic, 1 being the first topic of that course in curriculum order. A
 * workbook is the source of truth for its topic and that part of it — delete
 * the file and the topic falls back to the built-in material.
 *
 * Called by the nightly cron endpoint (/api/public/sheet-sync) and by the
 * owner-only "Sync now" server function. Server-only: imported dynamically.
 */
import type { Json } from "@/integrations/supabase/types";
import { ownerLessonFromTabs, type SheetTab } from "@/lib/owner-lessons-shared";
import { ownerWorkFromTabs } from "@/lib/owner-work-shared";
import type { OwnerTopicWork } from "@/lib/owner-work-shared";
import { learningPathFromRow, pathCertificationId, pathTopicId } from "@/lib/learning-paths-shared";
import {
  fileNumber,
  ownerQuestionFromRow,
  topicForNumber,
  type NumberedTopic,
  type OwnerDomain,
} from "@/lib/owner-questions-shared";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_excel";
const JOB = "sheet-sync";
const LOCK_MINUTES = 15;
const INSERT_CHUNK = 500;

/** The built-in course folders, and the four sub-folders each of them holds. */
export const COURSE_FOLDERS: Array<{ domain: OwnerDomain; root: string }> = [
  { domain: "it-cybersecurity", root: "it path" },
  { domain: "auto-repair", root: "auto path" },
];

/**
 * Every folder to read: the two built-in courses plus each path created in
 * Settings, which always reads "<name> path" and numbers the sections the
 * owner typed when creating it.
 */
async function courseFolders(): Promise<
  Array<{ domain: OwnerDomain; root: string; topics?: NumberedTopic[] }>
> {
  const folders: Array<{ domain: OwnerDomain; root: string; topics?: NumberedTopic[] }> = [
    ...COURSE_FOLDERS,
  ];
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("learning_paths")
      .select("slug, name, folder, topics, visible")
      .order("created_at", { ascending: true });
    for (const row of data ?? []) {
      const path = learningPathFromRow(row);
      folders.push({
        domain: path.slug,
        root: path.folder,
        topics: path.topics.map((title, index) => ({
          number: index + 1,
          topicId: pathTopicId(path.slug, index + 1),
          title,
          domain: path.slug,
          certificationId: pathCertificationId(path.slug),
        })),
      });
    }
  } catch {
    /* created paths are unavailable; the built-in courses still sync */
  }
  return folders;
}

export const SUB_FOLDERS = ["lessons", "try it", "quiz", "labs"] as const;

async function graph(path: string): Promise<any> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["MICROSOFT_EXCEL_API_KEY"];
  if (!apiKey || !connectionKey) {
    throw new Error("the Excel connection is not configured in this environment");
  }
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": connectionKey },
  });
  if (!response.ok) {
    throw new Error(`Excel request failed [${response.status}]: ${(await response.text()).slice(0, 300)}`);
  }
  return response.json();
}

interface SheetFile {
  id: string;
  name: string;
}

/** Everything in one folder, numbered workbooks only, in numeric order. */
async function listWorkbooks(root: string, sub: string): Promise<SheetFile[]> {
  const path = `${root}/${sub}`.split("/").map(encodeURIComponent).join("/");
  const listing: { value?: Array<{ id?: string; name: string; file?: unknown }> } = await graph(
    `/me/drive/root:/${path}:/children`,
  );
  return (listing.value ?? [])
    .filter((item) => item.file && item.name.endsWith(".xlsx") && item.id)
    .map((item) => ({ id: item.id!, name: item.name }))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
}

/** Every worksheet of a workbook, as tab name plus rows of text. */
async function readTabs(fileId: string): Promise<SheetTab[]> {
  const sheets = await graph(`/me/drive/items/${fileId}/workbook/worksheets`);
  const tabs: SheetTab[] = [];
  for (const sheet of sheets.value ?? []) {
    const used = await graph(
      `/me/drive/items/${fileId}/workbook/worksheets/${encodeURIComponent(sheet.id)}` +
        `/usedRange(valuesOnly=true)?$select=values`,
    );
    tabs.push({
      name: String(sheet.name ?? ""),
      rows: (used.values ?? []).map((row: unknown[]) => row.map((value) => String(value ?? ""))),
    });
  }
  return tabs;
}

export interface SheetSyncResult {
  ok: boolean;
  lessonsApproved?: number;
  /** Topics whose try-it or labs workbook was pulled in. */
  workTopics?: number;
  lessonsRejected?: number;
  /** Why each lesson carried a note, so it can be fixed in the sheet. */
  lessonIssues?: Array<{ file: string; topic: string; reasons: string[] }>;
  skipped?: string;
  syncedAt?: string;
  topics?: number;
  approved?: number;
  rejected?: number;
  report?: Record<string, unknown>[];
  error?: string;
}

function dataRows(values: unknown[][]): Array<{ rowNumber: number; cells: string[] }> {
  return values
    .slice(1)
    .map((row, index) => ({ rowNumber: index + 2, cells: row.map((cell) => String(cell ?? "").trim()) }))
    .filter(({ cells }) => cells.some(Boolean));
}

export async function runSheetSync(options: { domain?: OwnerDomain } = {}): Promise<SheetSyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date();
  const until = new Date(now.getTime() + LOCK_MINUTES * 60_000).toISOString();

  // Single flight: take the lock only when nobody holds a live one.
  const taken = await supabaseAdmin
    .from("job_locks")
    .update({ locked_until: until, updated_at: now.toISOString() })
    .eq("job", JOB)
    .lt("locked_until", now.toISOString())
    .select("job");
  if (!taken.data?.length) {
    const created = await supabaseAdmin
      .from("job_locks")
      .insert({ job: JOB, locked_until: until })
      .select("job");
    if (!created.data?.length) return { ok: true, skipped: "another run holds the lock" };
  }

  let approvedTotal = 0;
  let rejectedTotal = 0;
  const topicsSynced = new Set<string>();
  const report: Record<string, unknown>[] = [];
  let lessonsApproved = 0;
  let lessonsRejected = 0;
  const lessonIssues: Array<{ file: string; topic: string; reasons: string[] }> = [];
  let workTopics = 0;

  try {
    for (const { domain, root, topics: pathTopics } of await courseFolders()) {
      if (options.domain && options.domain !== domain) continue;
      const pickTopic = (number: number | undefined): NumberedTopic | undefined =>
        number === undefined
          ? undefined
          : pathTopics
            ? pathTopics.find((topic) => topic.number === number)
            : topicForNumber(domain, number);

      // ---- lessons -------------------------------------------------------
      let lessonFiles: SheetFile[] = [];
      try {
        lessonFiles = await listWorkbooks(root, "lessons");
      } catch (error) {
        report.push({
          domain,
          folder: `${root}/lessons`,
          skipped: String(error instanceof Error ? error.message : error),
        });
      }

      for (const file of lessonFiles) {
        const number = fileNumber(file.name);
        const topic = pickTopic(number);
        if (!topic) {
          report.push({ domain, folder: `${root}/lessons`, file: file.name, skipped: "filename number has no matching topic" });
          continue;
        }

        const tabs = await readTabs(file.id);
        const result = ownerLessonFromTabs(topic, tabs);
        if (!result.lesson) {
          lessonsRejected += 1;
          lessonIssues.push({
            file: file.name,
            topic: topic.title,
            reasons: [result.error ?? "the workbook could not be read"],
          });
          report.push({ domain, folder: `${root}/lessons`, file: file.name, topic: topic.title, skipped: result.error });
          continue;
        }

        // The owner verifies their own lessons, so a readable lesson always
        // goes live. Anything the automatic checks flag is kept as a note.
        const notes = result.rejectReasons ?? [];
        if (notes.length) lessonIssues.push({ file: file.name, topic: topic.title, reasons: notes });

        await supabaseAdmin
          .from("owner_lessons")
          .delete()
          .eq("domain", domain)
          .eq("topic_id", topic.topicId);
        const { error } = await supabaseAdmin.from("owner_lessons").insert({
          domain,
          topic_id: topic.topicId,
          source_file: file.name,
          lesson: result.lesson as unknown as Json,
          sources: result.sources as unknown as Json,
          practice: result.practice as unknown as Json,
          extras: result.extras as unknown as Json,
          status: "approved",
          reject_reasons: notes,
        });
        if (error) throw new Error(`storing lesson ${file.name}: ${error.message}`);

        lessonsApproved += 1;
        topicsSynced.add(topic.topicId);
        report.push({ domain, folder: `${root}/lessons`, file: file.name, topic: topic.title, lesson: "published", notes });
      }

      // ---- try it and labs, merged into one row per topic ----------------
      const work = new Map<string, { topic: NumberedTopic; work: OwnerTopicWork; files: string[] }>();

      for (const sub of ["try it", "labs"] as const) {
        let files: SheetFile[] = [];
        try {
          files = await listWorkbooks(root, sub);
        } catch (error) {
          report.push({
            domain,
            folder: `${root}/${sub}`,
            skipped: String(error instanceof Error ? error.message : error),
          });
          continue;
        }

        for (const file of files) {
          const number = fileNumber(file.name);
          const topic = pickTopic(number);
          if (!topic) {
            report.push({ domain, folder: `${root}/${sub}`, file: file.name, skipped: "filename number has no matching topic" });
            continue;
          }

          const tabs = await readTabs(file.id);
          const parsed = ownerWorkFromTabs(topic, tabs);
          const existing = work.get(topic.topicId);
          const merged: OwnerTopicWork = {
            recall: parsed.recall.length ? parsed.recall : (existing?.work.recall ?? []),
            ...(parsed.practice?.length
              ? { practice: parsed.practice }
              : existing?.work.practice
                ? { practice: existing.work.practice }
                : {}),
            ...(parsed.labs?.length
              ? { labs: parsed.labs }
              : existing?.work.labs
                ? { labs: existing.work.labs }
                : {}),
            ...(parsed.teachBack ?? existing?.work.teachBack
              ? { teachBack: parsed.teachBack ?? existing!.work.teachBack! }
              : {}),
            ...(parsed.scenario ?? existing?.work.scenario
              ? { scenario: parsed.scenario ?? existing!.work.scenario! }
              : {}),
            ...(parsed.troubleshooting ?? existing?.work.troubleshooting
              ? { troubleshooting: parsed.troubleshooting ?? existing!.work.troubleshooting! }
              : {}),
          };
          work.set(topic.topicId, {
            topic,
            work: merged,
            files: [...(existing?.files ?? []), file.name],
          });
          report.push({
            domain,
            folder: `${root}/${sub}`,
            file: file.name,
            topic: topic.title,
            practice: parsed.practice?.length ?? 0,
            recall: parsed.recall.length,
            teachBack: Boolean(parsed.teachBack),
            scenario: Boolean(parsed.scenario),
            labs: parsed.labs?.length ?? 0,
          });
        }
      }

      for (const [topicId, entry] of work) {
        const item = entry.work;
        const hasWork = Boolean(
          item.recall.length ||
            item.practice?.length ||
            item.labs?.length ||
            item.teachBack ||
            item.scenario ||
            item.troubleshooting,
        );
        await supabaseAdmin
          .from("owner_topic_work")
          .delete()
          .eq("domain", domain)
          .eq("topic_id", topicId);
        if (!hasWork) continue;

        const { error } = await supabaseAdmin.from("owner_topic_work").insert({
          domain,
          topic_id: topicId,
          source_file: entry.files.join(", "),
          work: item as unknown as Json,
          status: "approved",
          notes: [],
        });
        if (error) throw new Error(`storing work for ${entry.topic.title}: ${error.message}`);
        workTopics += 1;
        topicsSynced.add(topicId);
      }

      // ---- quiz ----------------------------------------------------------
      let quizFiles: SheetFile[] = [];
      try {
        quizFiles = await listWorkbooks(root, "quiz");
      } catch (error) {
        report.push({
          domain,
          folder: `${root}/quiz`,
          skipped: String(error instanceof Error ? error.message : error),
        });
      }

      for (const file of quizFiles) {
        const number = fileNumber(file.name);
        const topic = pickTopic(number);
        if (!topic) {
          report.push({ domain, folder: `${root}/quiz`, file: file.name, skipped: "filename number has no matching topic" });
          continue;
        }

        const approved: Array<{ rowNumber: number; question: Json }> = [];
        const rejected: Array<{ rowNumber: number; question: Json; reasons: string[] }> = [];
        const failed: Array<{ rowNumber: number; error: string }> = [];
        const sheets = await graph(`/me/drive/items/${file.id}/workbook/worksheets`);

        for (const sheet of sheets.value ?? []) {
          const used = await graph(
            `/me/drive/items/${file.id}/workbook/worksheets/${encodeURIComponent(sheet.id)}` +
              `/usedRange(valuesOnly=true)?$select=values`,
          );
          for (const { rowNumber, cells } of dataRows(used.values ?? [])) {
            const result = ownerQuestionFromRow(topic, cells, file.name, rowNumber);
            if (result.question && !result.rejectReasons) {
              approved.push({ rowNumber, question: result.question as unknown as Json });
            } else if (result.question) {
              rejected.push({
                rowNumber,
                question: result.question as unknown as Json,
                reasons: result.rejectReasons ?? [],
              });
            } else {
              failed.push({ rowNumber, error: result.error ?? "unreadable row" });
            }
          }
        }

        // A workbook that parsed nothing usable is treated as broken, not as
        // an instruction to wipe the topic's working questions.
        if (!approved.length && !rejected.length) {
          report.push({
            domain,
            folder: `${root}/quiz`,
            file: file.name,
            topic: topic.title,
            skipped: "no readable question rows — the topic keeps its previous questions",
            unreadable: failed.length,
          });
          continue;
        }

        await supabaseAdmin
          .from("owner_questions")
          .delete()
          .eq("domain", domain)
          .eq("topic_id", topic.topicId);

        const rows = [
          ...approved.map((row) => ({
            domain,
            topic_id: topic.topicId,
            source_file: file.name,
            row_number: row.rowNumber,
            question: row.question,
            status: "approved",
            reject_reasons: [],
          })),
          ...rejected.map((row) => ({
            domain,
            topic_id: topic.topicId,
            source_file: file.name,
            row_number: row.rowNumber,
            question: row.question,
            status: "rejected",
            reject_reasons: row.reasons,
          })),
        ];
        for (let index = 0; index < rows.length; index += INSERT_CHUNK) {
          const { error } = await supabaseAdmin
            .from("owner_questions")
            .insert(rows.slice(index, index + INSERT_CHUNK));
          if (error) throw new Error(`storing ${file.name}: ${error.message}`);
        }

        approvedTotal += approved.length;
        rejectedTotal += rejected.length;
        topicsSynced.add(topic.topicId);
        report.push({
          domain,
          folder: `${root}/quiz`,
          file: file.name,
          topic: topic.title,
          approved: approved.length,
          rejected: rejected.length,
          unreadable: failed.length,
        });
      }
    }

    await supabaseAdmin
      .from("job_locks")
      .update({
        locked_until: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        note: `synced ${topicsSynced.size} topic(s), ${approvedTotal} approved, ${rejectedTotal} rejected, ${lessonsApproved} lesson(s) published, ${workTopics} try-it/lab topic(s)`,
      })
      .eq("job", JOB);

    return {
      ok: true,
      syncedAt: new Date().toISOString(),
      topics: topicsSynced.size,
      approved: approvedTotal,
      rejected: rejectedTotal,
      lessonsApproved,
      lessonsRejected,
      lessonIssues,
      workTopics,
      report,
    };
  } catch (error) {
    await supabaseAdmin
      .from("job_locks")
      .update({
        locked_until: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        note: `failed: ${String(error instanceof Error ? error.message : error).slice(0, 200)}`,
      })
      .eq("job", JOB);
    return {
      ok: false,
      error: String(error instanceof Error ? error.message : error),
      report,
    };
  }
}

/**
 * Releases the single-flight lock so a new sync can start.
 *
 * A crashed or timed-out run can leave the lock held until it expires; this
 * clears it immediately.
 */
export async function releaseSyncLock(): Promise<{ ok: boolean; error?: string; heldSince?: string | undefined }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const current = await supabaseAdmin
    .from("job_locks")
    .select("locked_until, updated_at")
    .eq("job", JOB)
    .maybeSingle();
  const { error } = await supabaseAdmin
    .from("job_locks")
    .update({
      locked_until: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      note: "lock cleared by the owner",
    })
    .eq("job", JOB);
  if (error) return { ok: false, error: error.message };
  return { ok: true, heldSince: current.data?.updated_at ?? undefined };
}

/**
 * Runs the next requested sync, if there is one.
 *
 * The owner's "Sync now" button only writes a request into sync_queue and
 * returns, so closing the app cannot interrupt anything. A scheduled job
 * calls this every minute and does the actual work on the server.
 */
export async function drainSyncQueue(): Promise<{ ran: boolean; id?: string; result?: SheetSyncResult }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Never start a second run on top of one already in flight.
  // A run that died mid-flight must not block the queue forever.
  const stale = new Date(Date.now() - LOCK_MINUTES * 60_000).toISOString();
  await supabaseAdmin
    .from("sync_queue")
    .update({
      status: "failed",
      error: "The run stopped before it finished. Start it again.",
      finished_at: new Date().toISOString(),
    })
    .eq("status", "running")
    .lt("started_at", stale);

  const running = await supabaseAdmin
    .from("sync_queue")
    .select("id")
    .eq("status", "running")
    .limit(1);
  if (running.data?.length) return { ran: false };

  const next = await supabaseAdmin
    .from("sync_queue")
    .select("id, scope")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const job = next.data;
  if (!job) return { ran: false };

  const claimed = await supabaseAdmin
    .from("sync_queue")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id");
  if (!claimed.data?.length) return { ran: false };

  try {
    const result = await runSheetSync(job.scope === "all" ? {} : { domain: job.scope });
    await supabaseAdmin
      .from("sync_queue")
      .update({
        status: result.ok ? "done" : "failed",
        error: result.ok ? null : (result.error ?? "The sync failed."),
        result: {
          skipped: result.skipped ?? null,
          topics: result.topics ?? 0,
          approved: result.approved ?? 0,
          rejected: result.rejected ?? 0,
          lessonsApproved: result.lessonsApproved ?? 0,
          lessonsRejected: result.lessonsRejected ?? 0,
          workTopics: result.workTopics ?? 0,
          lessonIssues: result.lessonIssues ?? [],
        } as unknown as Json,
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    await supabaseAdmin.rpc("stop_sync_worker");
    return { ran: true, id: job.id, result };
  } catch (error) {
    await supabaseAdmin
      .from("sync_queue")
      .update({
        status: "failed",
        error: String(error instanceof Error ? error.message : error).slice(0, 400),
        finished_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return { ran: true, id: job.id };
  }
}
