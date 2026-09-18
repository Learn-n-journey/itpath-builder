/**
 * Job source discovery.
 *
 * The board catalogue is not a fixed list. Every few hours the server probes a
 * wide catalogue of candidate company career boards (Greenhouse, Lever, Ashby)
 * and keeps the ones that answer with real postings, dropping the ones that
 * have gone away. New candidates added here are picked up on the next probe,
 * and a board that starts publishing later joins the feed on its own.
 */

export type BoardProvider = "greenhouse" | "lever" | "ashby";

export interface DiscoveredBoard {
  provider: BoardProvider;
  slug: string;
  /** Company name shown on the card. */
  name: string;
  /** How many postings the board had when it was last probed. */
  count: number;
}

/** Candidate company boards. Dead ones are skipped automatically after probing. */
const CANDIDATES: { provider: BoardProvider; slug: string; name: string }[] = [
  ...[
    ["datadog", "Datadog"],
    ["stripe", "Stripe"],
    ["cloudflare", "Cloudflare"],
    ["robinhood", "Robinhood"],
    ["dropbox", "Dropbox"],
    ["reddit", "Reddit"],
    ["coinbase", "Coinbase"],
    ["gitlab", "GitLab"],
    ["elastic", "Elastic"],
    ["mongodb", "MongoDB"],
    ["databricks", "Databricks"],
    ["asana", "Asana"],
    ["figma", "Figma"],
    ["airtable", "Airtable"],
    ["instacart", "Instacart"],
    ["lyft", "Lyft"],
    ["pinterest", "Pinterest"],
    ["twilio", "Twilio"],
    ["doordashusa", "DoorDash"],
    ["samsara", "Samsara"],
    ["affirm", "Affirm"],
    ["flexport", "Flexport"],
    ["benchling", "Benchling"],
    ["sofi", "SoFi"],
    ["nerdwallet", "NerdWallet"],
    ["thumbtack", "Thumbtack"],
    ["hashicorpjobs", "HashiCorp"],
    ["grafanalabs", "Grafana Labs"],
    ["sentry", "Sentry"],
    ["vercel", "Vercel"],
    ["retool", "Retool"],
    ["scaleai", "Scale AI"],
    ["chainalysis", "Chainalysis"],
    ["crusoeenergy", "Crusoe"],
    ["wealthsimple", "Wealthsimple"],
    ["duolingo", "Duolingo"],
    ["udemy", "Udemy"],
    ["zapier", "Zapier"],
    ["gusto", "Gusto"],
    ["carta", "Carta"],
  ].map(([slug, name]) => ({ provider: "greenhouse" as const, slug: slug!, name: name! })),
  ...[
    ["netflix", "Netflix"],
    ["voleon", "Voleon"],
    ["palantir", "Palantir"],
    ["spotify", "Spotify"],
    ["shopify", "Shopify"],
    ["ncr", "NCR"],
    ["kraken", "Kraken"],
    ["mistral", "Mistral AI"],
    ["leverdemo", "Lever"],
    ["binance", "Binance"],
    ["blockchain", "Blockchain.com"],
    ["nielsen", "Nielsen"],
    ["fivetran", "Fivetran"],
    ["cohere", "Cohere"],
  ].map(([slug, name]) => ({ provider: "lever" as const, slug: slug!, name: name! })),
  ...[
    ["ramp", "Ramp"],
    ["openai", "OpenAI"],
    ["anthropic", "Anthropic"],
    ["notion", "Notion"],
    ["linear", "Linear"],
    ["deel", "Deel"],
    ["rippling", "Rippling"],
    ["mercury", "Mercury"],
    ["clickhouse", "ClickHouse"],
    ["cursor", "Cursor"],
    ["replit", "Replit"],
    ["vanta", "Vanta"],
    ["wiz", "Wiz"],
    ["huggingface", "Hugging Face"],
  ].map(([slug, name]) => ({ provider: "ashby" as const, slug: slug!, name: name! })),
];

export function boardListUrl(provider: BoardProvider, slug: string): string {
  if (provider === "greenhouse") return `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
  if (provider === "lever") return `https://api.lever.co/v0/postings/${slug}?mode=json`;
  return `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
}

function countPostings(provider: BoardProvider, payload: unknown): number {
  if (provider === "lever") return Array.isArray(payload) ? payload.length : 0;
  const jobs = (payload as { jobs?: unknown[] } | null)?.jobs;
  return Array.isArray(jobs) ? jobs.length : 0;
}

const DISCOVERY_MS = 6 * 60 * 60 * 1000;
let discovered: DiscoveredBoard[] = [];
let discoveredAt = 0;
let inFlight: Promise<DiscoveredBoard[]> | null = null;

async function probe(candidate: (typeof CANDIDATES)[number]): Promise<DiscoveredBoard | null> {
  try {
    const res = await fetch(boardListUrl(candidate.provider, candidate.slug), {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "IT PATH study app (job board links)" },
    });
    if (!res.ok) return null;
    const count = countPostings(candidate.provider, await res.json());
    if (count === 0) return null;
    return { ...candidate, count };
  } catch {
    return null;
  }
}

async function runDiscovery(): Promise<DiscoveredBoard[]> {
  const found: DiscoveredBoard[] = [];
  const batchSize = 12;
  for (let i = 0; i < CANDIDATES.length; i += batchSize) {
    const batch = CANDIDATES.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(probe));
    for (const result of results) if (result) found.push(result);
  }
  return found;
}

/**
 * Boards known to be live. Re-probes in the background once the list is stale,
 * so a request never waits on discovery after the first run.
 */
export async function getLiveBoards(): Promise<DiscoveredBoard[]> {
  const stale = Date.now() - discoveredAt > DISCOVERY_MS;
  if (discovered.length > 0 && !stale) return discovered;

  if (!inFlight) {
    inFlight = runDiscovery()
      .then((found) => {
        if (found.length > 0) {
          discovered = found;
          discoveredAt = Date.now();
        }
        return discovered;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  // First run has nothing to serve yet, so wait for it. Later refreshes keep
  // serving the previous list while the probe finishes.
  if (discovered.length === 0) return inFlight;
  void inFlight;
  return discovered;
}
