/**
 * Scheduled content audit.
 *
 * Runs the full rule book — the same deterministic checks that gate
 * development — over the shipped material of every course, and records what
 * it finds. A scheduler calls this once a day with the cron secret. It never
 * changes or approves anything: it only reports, so a problem introduced by a
 * data change is caught the same night instead of by a reader.
 */
import { createFileRoute } from "@tanstack/react-router";

import { buildItPackage } from "@/content/packs/it-package";
import { autoRepairPackage } from "@/content/packs/auto-repair/3.7.0/package";
import { auditPackage } from "@/lib/domain/package-audit";

/** How long one run may hold the lock before another run may take over. */
const LOCK_MINUTES = 10;
const JOB = "content-audit";

/** Findings are kept whole; today the rule book reports zero lines. */
const MAX_FINDINGS = 500;

export const Route = createFileRoute("/api/public/content-audit")({
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

        const packs = [
          { label: "it-cybersecurity", pkg: buildItPackage() },
          { label: "auto-repair", pkg: autoRepairPackage },
        ] as const;

        const results: Array<Record<string, unknown>> = [];
        let blocking = 0;
        let warnings = 0;

        for (const { label, pkg } of packs) {
          const startedAt = Date.now();
          const report = auditPackage(pkg as never);
          const packBlocking = report.findings.filter((f) => f.severity === "blocking");
          const packWarnings = report.findings.filter((f) => f.severity !== "blocking");
          blocking += packBlocking.length;
          warnings += packWarnings.length;

          await supabaseAdmin.from("content_audit_runs").insert({
            pack: pkg.manifest.key,
            duration_ms: Date.now() - startedAt,
            blocking: packBlocking.length,
            warnings: packWarnings.length,
            findings: report.findings.slice(0, MAX_FINDINGS),
          });

          results.push({
            pack: pkg.manifest.key,
            blocking: packBlocking.length,
            warnings: packWarnings.length,
            durationMs: Date.now() - startedAt,
          });
        }

        await supabaseAdmin
          .from("job_locks")
          .update({ locked_until: new Date().toISOString(), note: `audited ${packs.length} packs` })
          .eq("job", JOB);

        return Response.json({ ok: true, packs: results, blocking, warnings });
      },
    },
  },
});
