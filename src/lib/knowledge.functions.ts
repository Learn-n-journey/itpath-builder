/**
 * AI Second Brain server functions.
 *
 * Stores everything a learner saves (notes, links, articles, videos,
 * screenshots, documents), extracts concepts with AI, and links each item to
 * the IT PATH curriculum topics and certifications so the rest of the app can
 * use the learner's own material.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { certifications, topics } from "@/data/static-content";
import { GATEWAY_CHAT_URL, UTILITY_MODEL } from "@/lib/ai-models";
import { allowAiCall } from "@/lib/ai-budget.server";
import { runAi } from "@/lib/ai/run.server";

export type KnowledgeKind =
  | "note"
  | "link"
  | "article"
  | "video"
  | "screenshot"
  | "document"
  | "material";

export interface KnowledgeItem {
  id: string;
  kind: KnowledgeKind;
  title: string;
  sourceUrl: string | null;
  notes: string | null;
  content: string | null;
  filePath: string | null;
  fileType: string | null;
  summary: string | null;
  concepts: string[];
  keyTerms: string[];
  topicIds: string[];
  certIds: string[];
  gaps: string[];
  contradictions: string[];
  status: "pending" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
}

type ListReply = { ok: true; items: KnowledgeItem[] } | { ok: false; error: string };
type ItemReply = { ok: true; item: KnowledgeItem } | { ok: false; error: string };
type OkReply = { ok: true } | { ok: false; error: string };
export type SearchReply =
  | { ok: true; answer: string; matches: { id: string; title: string; why: string }[] }
  | { ok: false; error: string };

const SELECT =
  "id, kind, title, source_url, notes, content, file_path, file_type, summary, concepts, key_terms, topic_ids, cert_ids, gaps, contradictions, status, created_at, updated_at";

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, 40);
}

function toItem(row: Record<string, unknown>): KnowledgeItem {
  return {
    id: String(row["id"]),
    kind: (row["kind"] as KnowledgeKind) ?? "note",
    title: String(row["title"] ?? "Untitled"),
    sourceUrl: (row["source_url"] as string | null) ?? null,
    notes: (row["notes"] as string | null) ?? null,
    content: (row["content"] as string | null) ?? null,
    filePath: (row["file_path"] as string | null) ?? null,
    fileType: (row["file_type"] as string | null) ?? null,
    summary: (row["summary"] as string | null) ?? null,
    concepts: strArray(row["concepts"]),
    keyTerms: strArray(row["key_terms"]),
    topicIds: strArray(row["topic_ids"]),
    certIds: strArray(row["cert_ids"]),
    gaps: strArray(row["gaps"]),
    contradictions: strArray(row["contradictions"]),
    status: (row["status"] as KnowledgeItem["status"]) ?? "pending",
    createdAt: String(row["created_at"]),
    updatedAt: String(row["updated_at"]),
  };
}

/* ------------------------------------------------------------------ */
/* AI extraction                                                       */
/* ------------------------------------------------------------------ */

interface Extraction {
  summary: string;
  concepts: string[];
  keyTerms: string[];
  topicIds: string[];
  certIds: string[];
  gaps: string[];
  contradictions: string[];
  extractedText?: string;
}

const EMPTY: Extraction = {
  summary: "",
  concepts: [],
  keyTerms: [],
  topicIds: [],
  certIds: [],
  gaps: [],
  contradictions: [],
};

function topicCatalogue(): string {
  return topics.map((t) => `${t.id} :: ${t.title} (${t.certificationId})`).join("\n");
}

function certCatalogue(): string {
  return certifications.map((c) => `${c.id} :: ${c.title}`).join("\n");
}

const EXTRACT_SYSTEM = `You index study material for an IT and cybersecurity certification study app.
Read the learner's saved material and return strict JSON only, no prose and no markdown fences.

JSON shape:
{
  "summary": "3-5 sentence factual summary of what this material actually says",
  "extractedText": "plain readable text of the material when it came from an image or document, otherwise an empty string",
  "concepts": ["specific IT concepts this material teaches"],
  "keyTerms": ["exam-relevant terms and acronyms found in the material"],
  "topicIds": ["ids copied exactly from the topic catalogue that this material covers"],
  "certIds": ["ids copied exactly from the certification catalogue"],
  "gaps": ["what a learner still would not know after only this material"],
  "contradictions": ["statements in the material that are wrong, outdated, or conflict with standard IT practice; empty when there are none"]
}

Rules: never invent topic or certification ids, copy them from the catalogues or leave the list empty.
Keep each list under 10 entries. Never invent facts that are not in the material; if the material is only a link
with no readable text, say so in the summary and base concepts on the title and the learner's notes only.`;

interface GatewayPart {
  type: string;
  text?: string;
  image_url?: { url: string };
  file?: { filename: string; file_data: string };
}

async function extract(
  apiKey: string,
  parts: GatewayPart[],
): Promise<{ ok: true; data: Extraction } | { ok: false; error: string }> {
  const res = await fetch(GATEWAY_CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: UTILITY_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_SYSTEM },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Topic catalogue:\n${topicCatalogue()}\n\nCertification catalogue:\n${certCatalogue()}`,
            },
            ...parts,
          ],
        },
      ],
    }),
  });

  if (res.status === 429) return { ok: false, error: "The AI is busy right now, try again in a moment." };
  if (res.status === 402) return { ok: false, error: "AI usage limit reached for this app." };
  if (!res.ok) return { ok: false, error: `AI request failed (${res.status}).` };

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const knownTopics = new Set(topics.map((t) => t.id));
    const knownCerts = new Set(certifications.map((c) => c.id));
    return {
      ok: true,
      data: {
        summary: typeof parsed["summary"] === "string" ? parsed["summary"] : "",
        concepts: strArray(parsed["concepts"]),
        keyTerms: strArray(parsed["keyTerms"]),
        topicIds: strArray(parsed["topicIds"]).filter((id) => knownTopics.has(id)),
        certIds: strArray(parsed["certIds"]).filter((id) => knownCerts.has(id)),
        gaps: strArray(parsed["gaps"]),
        contradictions: strArray(parsed["contradictions"]),
        extractedText:
          typeof parsed["extractedText"] === "string" ? parsed["extractedText"].slice(0, 40000) : "",
      },
    };
  } catch {
    return { ok: false, error: "The AI returned an unreadable result. Try saving again." };
  }
}

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const listKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ListReply> => {
    const { data, error } = await context.supabase
      .from("knowledge_items")
      .select(SELECT)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) return { ok: false, error: error.message };
    return { ok: true, items: (data ?? []).map((row) => toItem(row as Record<string, unknown>)) };
  });

export const getKnowledgeFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ path: z.string().min(1) }).parse(data))
  .handler(async ({ context, data }): Promise<{ ok: true; url: string } | { ok: false; error: string }> => {
    if (!data.path.startsWith(`${context.userId}/`)) return { ok: false, error: "Not your file." };
    const { data: signed, error } = await context.supabase.storage
      .from("knowledge")
      .createSignedUrl(data.path, 60 * 10);
    if (error || !signed) return { ok: false, error: error?.message ?? "Could not open that file." };
    return { ok: true, url: signed.signedUrl };
  });

/* ------------------------------------------------------------------ */
/* Save                                                                */
/* ------------------------------------------------------------------ */

const saveSchema = z.object({
  kind: z.enum(["note", "link", "article", "video", "screenshot", "document", "material"]),
  title: z.string().min(1).max(200),
  sourceUrl: z.string().max(2000).optional(),
  notes: z.string().max(20000).optional(),
  text: z.string().max(200000).optional(),
  file: z
    .object({
      name: z.string().max(200),
      mime: z.string().max(120),
      base64: z.string().max(12_000_000),
    })
    .optional(),
});

export const saveKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => saveSchema.parse(data))
  .handler(async ({ context, data }): Promise<ItemReply> => {
    const apiKey = process.env["LOVABLE_API_KEY"];

    let filePath: string | null = null;
    let fileType: string | null = null;

    if (data.file) {
      const bytes = Uint8Array.from(atob(data.file.base64), (c) => c.charCodeAt(0));
      const safeName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
      const path = `${context.userId}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await context.supabase.storage
        .from("knowledge")
        .upload(path, bytes, { contentType: data.file.mime, upsert: false });
      if (upErr) return { ok: false, error: `Could not store the file: ${upErr.message}` };
      filePath = path;
      fileType = data.file.mime;
    }

    const insert = {
      user_id: context.userId,
      kind: data.kind,
      title: data.title,
      source_url: data.sourceUrl?.trim() || null,
      notes: data.notes?.trim() || null,
      content: data.text?.trim() || null,
      file_path: filePath,
      file_type: fileType,
      status: "pending",
    };

    const { data: row, error } = await context.supabase
      .from("knowledge_items")
      .insert(insert)
      .select(SELECT)
      .single();
    if (error || !row) return { ok: false, error: error?.message ?? "Could not save this item." };

    let item = toItem(row as Record<string, unknown>);
    if (!apiKey) return { ok: true, item };

    const parts: GatewayPart[] = [
      {
        type: "text",
        text: [
          `Kind: ${data.kind}`,
          `Title: ${data.title}`,
          data.sourceUrl ? `Source URL: ${data.sourceUrl}` : "",
          data.notes ? `Learner notes:\n${data.notes}` : "",
          data.text ? `Pasted material:\n${data.text.slice(0, 60000)}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ];

    if (data.file) {
      const dataUrl = `data:${data.file.mime};base64,${data.file.base64}`;
      if (data.file.mime.startsWith("image/")) {
        parts.push({ type: "image_url", image_url: { url: dataUrl } });
      } else if (data.file.mime === "application/pdf") {
        parts.push({ type: "file", file: { filename: data.file.name, file_data: dataUrl } });
      }
    }

    const result = await extract(apiKey, parts);
    const update = result.ok
      ? {
          summary: result.data.summary || null,
          concepts: result.data.concepts,
          key_terms: result.data.keyTerms,
          topic_ids: result.data.topicIds,
          cert_ids: result.data.certIds,
          gaps: result.data.gaps,
          contradictions: result.data.contradictions,
          content: item.content ?? (result.data.extractedText || null),
          status: "ready",
        }
      : { status: "failed", summary: result.error };

    const { data: updated } = await context.supabase
      .from("knowledge_items")
      .update(update)
      .eq("id", item.id)
      .eq("user_id", context.userId)
      .select(SELECT)
      .maybeSingle();
    if (updated) item = toItem(updated as Record<string, unknown>);
    return { ok: true, item };
  });

export const deleteKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ context, data }): Promise<OkReply> => {
    const { data: row } = await context.supabase
      .from("knowledge_items")
      .select("file_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    const path = (row as { file_path?: string | null } | null)?.file_path;
    if (path) await context.supabase.storage.from("knowledge").remove([path]);
    const { error } = await context.supabase
      .from("knowledge_items")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Natural language search                                             */
/* ------------------------------------------------------------------ */

function itemDigest(item: KnowledgeItem): string {
  return [
    `id: ${item.id}`,
    `title: ${item.title}`,
    item.summary ? `summary: ${item.summary}` : "",
    item.concepts.length ? `concepts: ${item.concepts.join(", ")}` : "",
    item.keyTerms.length ? `terms: ${item.keyTerms.join(", ")}` : "",
    item.notes ? `notes: ${item.notes.slice(0, 600)}` : "",
    item.content ? `text: ${item.content.slice(0, 1200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export const searchKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ query: z.string().min(2).max(500) }).parse(data))
  .handler(async ({ context, data }): Promise<SearchReply> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "AI service is not configured." };

    const { data: rows, error } = await context.supabase
      .from("knowledge_items")
      .select(SELECT)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(120);
    if (error) return { ok: false, error: error.message };

    const items = (rows ?? []).map((row) => toItem(row as Record<string, unknown>));
    if (items.length === 0)
      return { ok: true, answer: "You have not saved any material yet.", matches: [] };

    const system = `You search a learner's own saved IT study material. Answer only from the material provided.
Return strict JSON: {"answer":"plain text answer, or a clear statement that the saved material does not cover it","matches":[{"id":"item id","why":"one line on why it is relevant"}]}
Never use ids that are not in the material list. Never add outside facts to the answer; if the saved material is thin, say what is missing.`;

    const digest = items.map(itemDigest).join("\n---\n");

    // Searching the same library for the same thing twice costs nothing the
    // second time, and a reworded question reuses the same answer.
    const result = await runAi({
      feature: "knowledge",
      userId: context.userId,
      system,
      prompt: `Question: ${data.query}\n\nSaved material:\n\n${digest}`,
      risk: "low",
      priority: "interactive",
      json: true,
      cache: {
        parts: [context.userId, data.query, String(items.length), digest.slice(0, 2000)],
        scope: `knowledge-search:${context.userId}:${items.length}`,
        semantic: true,
        threshold: 0.95,
      },
    });
    if (!result.ok) return { ok: false, error: result.error };

    const raw = result.text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      const parsed = JSON.parse(raw) as { answer?: string; matches?: { id?: string; why?: string }[] };
      const byId = new Map(items.map((i) => [i.id, i]));
      const matches = (parsed.matches ?? [])
        .map((m) => ({ id: String(m.id ?? ""), why: String(m.why ?? "") }))
        .filter((m) => byId.has(m.id))
        .map((m) => ({ ...m, title: byId.get(m.id)!.title }));
      return { ok: true, answer: parsed.answer?.trim() || "No answer returned.", matches };
    } catch {
      return { ok: false, error: "The search returned an unreadable result. Try again." };
    }
  });
