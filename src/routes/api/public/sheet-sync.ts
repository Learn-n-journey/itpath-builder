/**
 * Nightly owner-question sync.
 *
 * A scheduled job calls this endpoint (or the owner triggers it by hand). It
 * reads the numbered spreadsheets in the owner's OneDrive folders — itpath for
 * IT PATH, autopath for AUTO PATH — maps each file's leading number to the
 * topic with that number, runs every row through the same deterministic
 * quality gate used at quiz time, and stores the results in the database.
 *
 * Approved rows become that topic's quiz pool everywhere; rejected rows are
 * kept with their reasons. Topics that have owner questions stop using their
 * generated questions entirely.
 */
import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";
import {
  fileNumber,
  ownerQuestionFromRow,
  topicForNumber,
  type OwnerDomain,
} from "@/lib/owner-questions-shared";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_excel";
const JOB = "sheet-sync";
const LOCK_MINUTES = 15;
const INSERT_CHUNK = 500;

const FOLDERS: Array<{ domain: OwnerDomain; folder: string }> = [
  { domain: "it-cybersecurity", folder: "itpath" },
  { domain: "auto-repair", folder: "autopath" },
];

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

function dataRows(values: unknown[][]): Array<{ rowNumber: number; cells: string[] }> {
  return values
    .slice(1)
    .map((row, index) => ({ rowNumber: index + 2, cells: row.map((cell) => String(cell ?? "").trim()) }))
    .filter(({ cells }) => cells.some(Boolean));
}

export const Route = createFileRoute("/api/public/sheet-sync")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-cron-secret") ?? "";
        const expected = process.env["LINK_CHECK_TOKEN"];
        if (!expected || secret !== expected) return new Response("Unauthorized", { status: 401 });

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
          if (!created.data?.length) return Response.json({ skipped: "another run holds the lock" });
        }

        let approvedTotal = 0;
        let rejectedTotal = 0;
        const topicsSynced = new Set<string>();
        const report: Record<string, unknown>[] = [];

        try {
          for (const { domain, folder } of FOLDERS) {
            let listing: { value?: Array<{ id?: string; name: string; file?: unknown }> };
            try {
              listing = await graph(`/me/drive/root:/${folder}:/children`);
            } catch (error) {
              report.push({ domain, folder, skipped: String(error instanceof Error ? error.message : error) });
              continue;
            }

            const files: SheetFile[] = (listing.value ?? [])
              .filter((item) => item.file && item.name.endsWith(".xlsx") && item.id)
              .map((item) => ({ id: item.id!, name: item.name }))
              .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));

            for (const file of files) {
              const number = fileNumber(file.name);
              const topic = number ? topicForNumber(domain, number) : undefined;
              if (!topic) {
                report.push({ domain, file: file.name, skipped: "filename number has no matching topic" });
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

              // The spreadsheet is the source of truth: replace the topic's
              // stored rows wholesale, so deletions and edits flow through.
              await supabaseAdmin
                .from("owner_questions")
                .delete()
                .eq("domain", domain)
                .eq("topic_id", topic.topicId);

              const rows = [
                ...approved.map((item) => ({
                  domain,
                  topic_id: topic.topicId,
                  source_file: file.name,
                  row_number: item.rowNumber,
                  question: item.question,
                  status: "approved",
                  reject_reasons: [],
                })),
                ...rejected.map((item) => ({
                  domain,
                  topic_id: topic.topicId,
                  source_file: file.name,
                  row_number: item.rowNumber,
                  question: item.question,
                  status: "rejected",
                  reject_reasons: item.reasons,
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
              note: `synced ${topicsSynced.size} topic(s), ${approvedTotal} approved, ${rejectedTotal} rejected`,
            })
            .eq("job", JOB);

          return Response.json({
            ok: true,
            syncedAt: new Date().toISOString(),
            topics: topicsSynced.size,
            approved: approvedTotal,
            rejected: rejectedTotal,
            report,
          });
        } catch (error) {
          await supabaseAdmin
            .from("job_locks")
            .update({
              locked_until: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              note: `failed: ${String(error instanceof Error ? error.message : error).slice(0, 200)}`,
            })
            .eq("job", JOB);
          return Response.json(
            { ok: false, error: String(error instanceof Error ? error.message : error), report },
            { status: 500 },
          );
        }
      },
    },
  },
});
