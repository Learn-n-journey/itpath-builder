import { createFileRoute } from "@tanstack/react-router";
import { microsoftAuthorizeUrl } from "@/lib/microsoft-graph.server";

export const Route = createFileRoute("/api/auth/microsoft")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const state = crypto.randomUUID();
        const headers = new Headers({ Location: microsoftAuthorizeUrl(state) });
        headers.append("Set-Cookie", `ms_oauth_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
