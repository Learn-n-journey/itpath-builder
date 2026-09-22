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

        let mode = "full";
        try {
          const body = (await request.json()) as { mode?: string } | null;
          mode = body?.mode === "drain" ? "drain" : "full";
        } catch {
          /* no body: the nightly full pull */
        }

        const { runSheetSync, drainSyncQueue } = await import("@/lib/sheet-sync.server");
        if (mode === "drain") {
          const drained = await drainSyncQueue();
          return Response.json(drained, { status: 200 });
        }
        const result = await runSheetSync();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
