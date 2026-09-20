/**
 * Nightly owner-question sync endpoint.
 *
 * A scheduled job calls this endpoint. The sync logic itself lives in
 * @/lib/sheet-sync.server so the owner's "Sync now" button can run the
 * exact same routine.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/sheet-sync")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-cron-secret") ?? "";
        const expected = process.env["LINK_CHECK_TOKEN"];
        if (!expected || secret !== expected) return new Response("Unauthorized", { status: 401 });

        const { runSheetSync } = await import("@/lib/sheet-sync.server");
        const result = await runSheetSync();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
