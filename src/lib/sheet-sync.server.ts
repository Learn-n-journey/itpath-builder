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
const EXCEL_ROW_PAGE = 1_000;
const MAX_GRAPH_ATTEMPTS = 5;
const RETRYABLE_GRAPH_STATUSES = new Set([429, 503, 504]);
/** How many different workbooks are read at the same time. */
const WORKBOOK_CONCURRENCY = 4;

/** Runs the same work over many items, a few at a time, keeping input order. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  work: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index] as T, index);
    }
  });
  await Promise.all(runners);
  return results;
}


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

function retryDelay(response: Response, attempt: number): number {
  const retryAfterMs = Number(response.headers.get("x-ms-retry-after-ms"));
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return Math.min(retryAfterMs, 30_000);

  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 30_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay) && dateDelay > 0) return Math.min(dateDelay, 30_000);
  }

  return Math.min(1_000 * 2 ** attempt, 16_000) + Math.floor(Math.random() * 500);
}

async function graph(path: string): Promise<any> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["MICROSOFT_EXCEL_API_KEY"];
  if (!apiKey || !connectionKey) {
    throw new Error("the Excel connection is not configured in this environment");
  }

  for (let attempt = 0; attempt < MAX_GRAPH_ATTEMPTS; attempt += 1) {
    const response = await fetch(`${GATEWAY_URL}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": connectionKey },
    });
    if (response.ok) return response.json();

    const message = (await response.text()).slice(0, 300);
    const canRetry = RETRYABLE_GRAPH_STATUSES.has(response.status) && attempt < MAX_GRAPH_ATTEMPTS - 1;
    if (!canRetry) {
      const suffix = RETRYABLE_GRAPH_STATUSES.has(response.status)
        ? ` after ${MAX_GRAPH_ATTEMPTS} attempts`
        : "";
      throw new Error(`Excel request failed [${response.status}]${suffix}: ${message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
  }

  throw new Error("Excel request failed after all retry attempts");
}

interface SheetFile {
  id: string;
  name: string;
  lastModified: string;
}

/** Everything in one folder, numbered workbooks only, in numeric order. */
async function listWorkbooks(root: string, sub: string): Promise<SheetFile[]> {
  const path = `${root}/${sub}`.split("/").map(encodeURIComponent).join("/");
  const listing: {
    value?: Array<{ id?: string; name: string; file?: unknown; lastModifiedDateTime?: string }>;
  } = await graph(`/me/drive/root:/${path}:/children?$select=id,name,file,lastModifiedDateTime`);
  return (listing.value ?? [])
    .filter((item) => item.file && item.name.endsWith(".xlsx") && item.id)
    .flatMap((item) =>
      item.id
        ? [{ id: item.id, name: item.name, lastModified: String(item.lastModifiedDateTime ?? "") }]
        : [],
    )
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
}

function columnName(column: number): string {
  let value = column;
  let result = "";
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result || "A";
}

function usedRangeStart(address: string): { row: number; column: number } {
  const localAddress = address.split("!").pop()?.replaceAll("$", "") ?? "A1";
  const match = /^([A-Z]+)(\d+)/i.exec(localAddress);
  if (!match) return { row: 1, column: 1 };
  const letters = match[1]?.toUpperCase() ?? "A";
  let column = 0;
  for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
  return { row: Number(match[2] ?? 1), column };
}

async function readSheetRows(fileId: string, sheetId: string): Promise<string[][]> {
  const base = `/me/drive/items/${fileId}/workbook/worksheets/${encodeURIComponent(sheetId)}`;
  const bounds: { address?: string; rowCount?: number; columnCount?: number } = await graph(
    `${base}/usedRange(valuesOnly=true)?$select=address,rowCount,columnCount`,
  );
  const rowCount = Math.max(0, Number(bounds.rowCount ?? 0));
  const columnCount = Math.max(0, Number(bounds.columnCount ?? 0));
  if (!rowCount || !columnCount) return [];

  const start = usedRangeStart(String(bounds.address ?? "A1"));
  const endColumn = columnName(start.column + columnCount - 1);
  const rows: string[][] = [];
  for (let offset = 0; offset < rowCount; offset += EXCEL_ROW_PAGE) {
    const firstRow = start.row + offset;
    const lastRow = Math.min(start.row + rowCount - 1, firstRow + EXCEL_ROW_PAGE - 1);
    const range = `${columnName(start.column)}${firstRow}:${endColumn}${lastRow}`;
    const page: { values?: unknown[][] } = await graph(
      `${base}/range(address='${range}')?$select=values`,
    );
    rows.push(...(page.values ?? []).map((row) => row.map((value) => String(value ?? ""))));
  }
  return rows;
}

/** Every worksheet of a workbook, as tab name plus rows of text. */
async function readTabs(fileId: string): Promise<SheetTab[]> {
  const sheets = await graph(`/me/drive/items/${fileId}/workbook/worksheets?$select=id,name`);
  const tabs: SheetTab[] = [];
  for (const sheet of sheets.value ?? []) {
    if (!sheet.id) continue;
    tabs.push({
      name: String(sheet.name ?? ""),
      rows: await readSheetRows(fileId, String(sheet.id)),
    });
  }
  return tabs;
}

export interface SheetSyncResult {
  ok: boolean;
  lessonsApproved?: number;
  /** Topics whose try-it or labs workbook was pulled in. */
  workTopics?: number;
  /** Workbooks OneDrive reported as unchanged, so they were not re-read. */
  unchangedFiles?: number;
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
  /** True when the run used up its time slice and still has work left. */
  partial?: boolean;
}

/** A snapshot of a sync while it is still running, for the live counter. */
export interface SyncProgress {
  stage: string;
  course: string;
  file?: string;
  filesDone: number;
  topics: number;
  approved: number;
  lessonsApproved: number;
  unchangedFiles: number;
  at: string;
}

function dataRows(values: unknown[][]): Array<{ rowNumber: number; cells: string[] }> {
  return values
    .slice(1)
    .map((row, index) => ({ rowNumber: index + 2, cells: row.map((cell) => String(cell ?? "").trim()) }))
    .filter(({ cells }) => cells.some(Boolean));
}

export async function runSheetSync(
  options: {
    domain?: OwnerDomain;
    force?: boolean;
    onProgress?: (progress: SyncProgress) => void | Promise<void>;
    /** Stop cleanly after this many milliseconds and report the rest as left over. */
    budgetMs?: number;
  } = {},
): Promise<SheetSyncResult> {
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
  let unchangedFiles = 0;
  let filesDone = 0;
  let partial = false;

  const deadline = options.budgetMs ? Date.now() + options.budgetMs : null;
  const outOfTime = (): boolean => deadline !== null && Date.now() >= deadline;

  // Reported while the run is still going, so the owner can watch it move.
  const emit = async (stage: string, course: string, file?: string): Promise<void> => {
    if (!options.onProgress) return;
    try {
      await options.onProgress({
        stage,
        course,
        ...(file ? { file } : {}),
        filesDone,
        topics: topicsSynced.size,
        approved: approvedTotal,
        lessonsApproved,
        unchangedFiles,
        at: new Date().toISOString(),
      });
    } catch {
      /* progress is only informational */
    }
  };

  // Skip workbooks OneDrive says have not changed since the last good sync.
  const seenState = new Map<string, string>();
  if (!options.force) {
    const { data } = await supabaseAdmin.from("sheet_file_state").select("file_id,last_modified");
    for (const row of data ?? []) seenState.set(row.file_id, row.last_modified);
  }
  const unchanged = (file: SheetFile): boolean =>
    !options.force && Boolean(file.lastModified) && seenState.get(file.id) === file.lastModified;
  const remember = async (file: SheetFile, domain: string, folder: string): Promise<void> => {
    if (!file.lastModified) return;
    await supabaseAdmin.from("sheet_file_state").upsert(
      {
        file_id: file.id,
        domain,
        folder,
        file_name: file.name,
        last_modified: file.lastModified,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "file_id" },
    );
  };

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

      const pendingLessons: Array<{ file: SheetFile; topic: NumberedTopic }> = [];
      for (const file of lessonFiles) {
        const number = fileNumber(file.name);
        const topic = pickTopic(number);
        if (!topic) {
          report.push({ domain, folder: `${root}/lessons`, file: file.name, skipped: "filename number has no matching topic" });
          continue;
        }
        if (unchanged(file)) {
          unchangedFiles += 1;
          continue;
        }
        pendingLessons.push({ file, topic });
      }

      // Different workbooks are read a few at a time; each one is still read
      // start to finish on its own, which is what Excel needs. Work is done in
      // small batches so the run can stop on time and pick up where it left off.
      const lessonBatches: Array<typeof pendingLessons> = [];
      for (let i = 0; i < pendingLessons.length; i += WORKBOOK_CONCURRENCY) {
        lessonBatches.push(pendingLessons.slice(i, i + WORKBOOK_CONCURRENCY));
      }

      for (const batch of lessonBatches) {
        if (outOfTime()) {
          partial = true;
          break;
        }
        const lessonTabs = await mapPool(batch, WORKBOOK_CONCURRENCY, async ({ file }) => {
          const tabs = await readTabs(file.id);
          filesDone += 1;
          await emit("lessons", domain, file.name);
          return tabs;
        });

        for (const [index, { file, topic }] of batch.entries()) {
        const tabs = lessonTabs[index] ?? [];
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

        await remember(file, domain, `${root}/lessons`);
        lessonsApproved += 1;
        topicsSynced.add(topic.topicId);
        report.push({ domain, folder: `${root}/lessons`, file: file.name, topic: topic.title, lesson: "published", notes });
        }
      }

      if (partial) break;

      // ---- try it and labs, merged into one row per topic ----------------
      const work = new Map<string, { topic: NumberedTopic; work: OwnerTopicWork; files: string[] }>();

      const workFolders: Array<{ sub: string; files: SheetFile[] }> = [];
      const workListings = await Promise.all(
        (["try it", "labs"] as const).map(async (sub) => {
          try {
            return { sub, files: await listWorkbooks(root, sub) };
          } catch (error) {
            return { sub, error: String(error instanceof Error ? error.message : error) };
          }
        }),
      );
      for (const listing of workListings) {
        if ("error" in listing) {
          report.push({ domain, folder: `${root}/${listing.sub}`, skipped: listing.error });
          continue;
        }
        workFolders.push(listing);
      }
      const allWorkFiles = workFolders.flatMap((entry) => entry.files);
      // Try-it and labs merge into one row per topic, so they are re-read
      // together as soon as any one of their workbooks changed.
      const workChanged = allWorkFiles.some((file) => !unchanged(file));
      if (!workChanged && allWorkFiles.length) {
        unchangedFiles += allWorkFiles.length;
        report.push({
          domain,
          folder: `${root}/try it + labs`,
          skipped: "no workbook changed since the last sync",
        });
      }

      const pendingWork: Array<{ sub: string; file: SheetFile; topic: NumberedTopic }> = [];
      for (const { sub, files } of workChanged ? workFolders : []) {
        for (const file of files) {
          const number = fileNumber(file.name);
          const topic = pickTopic(number);
          if (!topic) {
            report.push({ domain, folder: `${root}/${sub}`, file: file.name, skipped: "filename number has no matching topic" });
            continue;
          }
          pendingWork.push({ sub, file, topic });
        }
      }

      // Try-it and labs are stored as one row per topic, so they are read as a
      // whole. If there is no time left for them, they wait for the next slice.
      if (pendingWork.length && outOfTime()) {
        partial = true;
        break;
      }

      const workTabs = await mapPool(pendingWork, WORKBOOK_CONCURRENCY, async ({ sub, file }) => {
        const tabs = await readTabs(file.id);
        filesDone += 1;
        await emit(sub, domain, file.name);
        return tabs;
      });

      {
        for (const [index, { sub, file, topic }] of pendingWork.entries()) {
          const parsed = ownerWorkFromTabs(topic, workTabs[index] ?? []);

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

      await Promise.all(
        (workChanged ? allWorkFiles : []).map((file) => remember(file, domain, `${root}/try it + labs`)),
      );

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

      const pendingQuiz: Array<{ file: SheetFile; topic: NumberedTopic }> = [];
      for (const file of quizFiles) {
        const number = fileNumber(file.name);
        const topic = pickTopic(number);
        if (!topic) {
          report.push({ domain, folder: `${root}/quiz`, file: file.name, skipped: "filename number has no matching topic" });
          continue;
        }
        if (unchanged(file)) {
          unchangedFiles += 1;
          continue;
        }
        pendingQuiz.push({ file, topic });
      }

      const quizBatches: Array<typeof pendingQuiz> = [];
      for (let i = 0; i < pendingQuiz.length; i += WORKBOOK_CONCURRENCY) {
        quizBatches.push(pendingQuiz.slice(i, i + WORKBOOK_CONCURRENCY));
      }

      for (const batch of quizBatches) {
      if (outOfTime()) {
        partial = true;
        break;
      }
      const quizTabs = await mapPool(batch, WORKBOOK_CONCURRENCY, async ({ file }) => {
        const tabs = await readTabs(file.id);
        filesDone += 1;
        await emit("quiz", domain, file.name);
        return tabs;
      });

      for (const [index, { file, topic }] of batch.entries()) {
        const approved: Array<{ rowNumber: number; question: Json }> = [];
        const rejected: Array<{ rowNumber: number; question: Json; reasons: string[] }> = [];
        const failed: Array<{ rowNumber: number; error: string }> = [];
        const tabs = quizTabs[index] ?? [];


        for (const tab of tabs) {
          for (const { rowNumber, cells } of dataRows(tab.rows)) {
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

        await remember(file, domain, `${root}/quiz`);
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

      if (partial) break;
    }

    await supabaseAdmin
      .from("job_locks")
      .update({
        locked_until: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        note: `synced ${topicsSynced.size} topic(s), ${approvedTotal} approved, ${rejectedTotal} rejected, ${lessonsApproved} lesson(s) published, ${workTopics} try-it/lab topic(s), ${unchangedFiles} unchanged workbook(s) skipped`,
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
      unchangedFiles,
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
    .select("id, scope, force")
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
    let lastProgressWrite = 0;
    const result = await runSheetSync({
      ...(job.scope === "all" ? {} : { domain: job.scope }),
      force: Boolean(job.force),
      onProgress: async (progress) => {
        const now = Date.now();
        if (now - lastProgressWrite < 3_000) return;
        lastProgressWrite = now;
        await supabaseAdmin
          .from("sync_queue")
          .update({ result: { progress } as unknown as Json })
          .eq("id", job.id);
      },
    });
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
          unchangedFiles: result.unchangedFiles ?? 0,
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
    await supabaseAdmin.rpc("stop_sync_worker");
    return { ran: true, id: job.id };
  }
}
