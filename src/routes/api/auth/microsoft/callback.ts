import { createFileRoute } from "@tanstack/react-router";
import { exchangeMicrosoftCode } from "@/lib/microsoft-graph.server";

function cookieValue(request: Request, name: string): string {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

export const Route = createFileRoute("/api/auth/microsoft/callback")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const error = url.searchParams.get("error");
        if (error) return new Response(`Microsoft authorization failed: ${error}`, { status: 400 });

        const code = url.searchParams.get("code") ?? "";
        const state = url.searchParams.get("state") ?? "";
        const expectedState = cookieValue(request, "ms_oauth_state");
        if (!code || !state || !expectedState || state !== expectedState) {
          return new Response("Invalid Microsoft authorization callback.", { status: 400 });
        }

        try {
          const { refreshToken } = await exchangeMicrosoftCode(code);
          const headers = new Headers({ "content-type": "text/html; charset=utf-8" });
          headers.append("Set-Cookie", "ms_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
          // Deliberately do not persist or print the token. The owner copies it
          // once into Cloudflare's encrypted MICROSOFT_REFRESH_TOKEN secret.
          const escaped = refreshToken.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          return new Response(
            `<!doctype html><title>OneDrive connected</title><main style="font:16px system-ui;max-width:760px;margin:48px auto;padding:20px"><h1>OneDrive authorization succeeded</h1><p>Copy this refresh token now and save it in Cloudflare Runtime as the encrypted secret <strong>MICROSOFT_REFRESH_TOKEN</strong>. Do not put it in GitHub or a .env file.</p><textarea readonly style="width:100%;height:180px">${escaped}</textarea><p>After saving it in Cloudflare, close this page.</p></main>`,
            { status: 200, headers },
          );
        } catch (cause) {
          return new Response(String(cause instanceof Error ? cause.message : cause), { status: 500 });
        }
      },
    },
  },
});
