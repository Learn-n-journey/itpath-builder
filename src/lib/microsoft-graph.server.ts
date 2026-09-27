/**
 * Microsoft Graph OAuth helpers for the owner's OneDrive worksheet sync.
 * Server-only. Tokens are never exposed to browser code.
 */
const GRAPH_SCOPE = "offline_access Files.Read User.Read";
const TOKEN_ENDPOINT = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const AUTHORIZE_ENDPOINT = "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing Microsoft environment variable: ${name}`);
  return value;
}

export function microsoftAuthorizeUrl(state: string): string {
  const url = new URL(AUTHORIZE_ENDPOINT);
  url.searchParams.set("client_id", required("MICROSOFT_CLIENT_ID"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", required("MICROSOFT_REDIRECT_URI"));
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", GRAPH_SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

async function tokenRequest(params: URLSearchParams): Promise<Record<string, unknown>> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Microsoft token request failed [${response.status}]: ${String(body.error_description ?? body.error ?? "unknown error").slice(0, 300)}`);
  }
  return body;
}

export async function exchangeMicrosoftCode(code: string): Promise<{ refreshToken: string }> {
  const body = await tokenRequest(new URLSearchParams({
    client_id: required("MICROSOFT_CLIENT_ID"),
    client_secret: required("MICROSOFT_CLIENT_SECRET"),
    code,
    redirect_uri: required("MICROSOFT_REDIRECT_URI"),
    grant_type: "authorization_code",
    scope: GRAPH_SCOPE,
  }));
  const refreshToken = String(body.refresh_token ?? "");
  if (!refreshToken) throw new Error("Microsoft did not return a refresh token.");
  return { refreshToken };
}

export async function microsoftAccessToken(): Promise<string> {
  const refreshToken = required("MICROSOFT_REFRESH_TOKEN");
  const body = await tokenRequest(new URLSearchParams({
    client_id: required("MICROSOFT_CLIENT_ID"),
    client_secret: required("MICROSOFT_CLIENT_SECRET"),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: GRAPH_SCOPE,
  }));
  const accessToken = String(body.access_token ?? "");
  if (!accessToken) throw new Error("Microsoft did not return an access token.");
  return accessToken;
}
