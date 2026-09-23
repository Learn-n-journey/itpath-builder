/**
 * Scheduled link crawler.
 *
 * Checks a bounded batch of the outside videos and documentation the
 * curriculum links to, oldest check first, and records what it found. A
 * scheduler calls this once a day with the cron secret. Only one run works at
 * a time, and each run stops after its batch even when links remain, so the
 * next run picks up where this one left off.
 */
import { createFileRoute } from "@tanstack/react-router";

import { externalLinks } from "@/lib/external-links";

/** How many links one run is allowed to check. */
const BATCH = 60;
/** How long one run may hold the lock before another run may take over. */
const LOCK_MINUTES = 10;
const JOB = "link-check";

interface CheckRow {
  url: string;
  checked_at: string | null;
  fail_count: number;
}

async function probe(url: string): Promise<{ status: number | null; error: string | null }> {
  const attempt = async (method: "HEAD" | "GET") =>
    fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "IT-PATH-link-check/1.0 (+https://it-path.net)" },
    });
  try {
    let response: Response;
    try {
      response = await attempt("HEAD");
    } catch {
      // A timed-out/reset HEAD request does not prove the learner-facing URL is
      // unavailable. Retry with the same GET request a browser would make.
      response = await attempt("GET");
    }
    // Documentation/CDN/WAF endpoints commonly reject or throttle HEAD while
    // serving GET normally. Confirm any non-success HEAD response with GET
    // before recording the source as unavailable.
    if (!response.ok) {
      response = await attempt("GET");
    }
    return { status: response.status, error: null };
  } catch (error) {
    return { status: null, error: error instanceof Error ? error.message.slice(0, 200) : "Request failed" };
  }
}

export const Route = createFileRoute("/api/public/link-check")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["LINK_CHECK_TOKEN"];
        const given = request.headers.get("x-cron-secret");
        if (!secret || given !== secret) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

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
          if (!created.data?.length) {
            return Response.json({ skipped: "another run holds the lock" });
          }
        }

        const links = externalLinks();
        const { data: rows } = await supabaseAdmin
          .from("link_checks")
          .select("url, checked_at, fail_count");
        const known = new Map<string, CheckRow>((rows ?? []).map((row) => [row.url, row as CheckRow]));

        const due = [...links].sort((a, b) => {
          const left = known.get(a.url)?.checked_at;
          const right = known.get(b.url)?.checked_at;
          if (!left && !right) return 0;
          if (!left) return -1;
          if (!right) return 1;
          return left.localeCompare(right);
        });

        let broken = 0;
        for (const link of due.slice(0, BATCH)) {
          const result = await probe(link.url);
          const ok = result.status !== null && result.status < 400;
          if (!ok) broken += 1;
          // Recorded item by item, so a run that dies half way keeps its work.
          await supabaseAdmin.from("link_checks").upsert({
            url: link.url,
            kind: link.kind,
            label: link.label,
            status: result.status,
            ok,
            fail_count: ok ? 0 : (known.get(link.url)?.fail_count ?? 0) + 1,
            last_error: result.error,
            checked_at: new Date().toISOString(),
          });
        }

        await supabaseAdmin
          .from("job_locks")
          .update({ locked_until: new Date().toISOString(), note: `checked ${Math.min(BATCH, due.length)}` })
          .eq("job", JOB);

        return Response.json({
          ok: true,
          checked: Math.min(BATCH, due.length),
          broken,
          totalLinks: links.length,
        });
      },
    },
  },
});
