import { createServerFn } from "@tanstack/react-start";

export interface AutoNewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string | null;
  source: string;
  category: AutoNewsCategory;
  publishedAt: string;
}

export type AutoNewsCategory =
  | "Repair & Maintenance"
  | "Diagnostics"
  | "Shop Business"
  | "New Cars"
  | "Electric Vehicles"
  | "Recalls & Safety"
  | "Tools & Equipment"
  | "Car Culture";

export const AUTO_NEWS_CATEGORIES: AutoNewsCategory[] = [
  "Repair & Maintenance",
  "Diagnostics",
  "Shop Business",
  "New Cars",
  "Electric Vehicles",
  "Recalls & Safety",
  "Tools & Equipment",
  "Car Culture",
];

interface Feed {
  url: string;
  source: string;
  fallback: AutoNewsCategory;
  /** How many of this feed's latest items may enter the mix, so one busy source cannot flood the page. */
  max?: number;
}

/**
 * Public RSS/Atom feeds from automotive outlets. Trade publications that serve
 * working technicians sit next to consumer car media so the feed covers both
 * the job and the industry.
 */
const FEEDS: Feed[] = [
  { url: "https://www.repairerdrivennews.com/feed/", source: "Repairer Driven News", fallback: "Shop Business" },
  { url: "https://www.vehicleservicepros.com/rss.xml", source: "Vehicle Service Pros", fallback: "Repair & Maintenance", max: 12 },
  { url: "https://www.ratchetandwrench.com/rss.xml", source: "Ratchet+Wrench", fallback: "Shop Business", max: 12 },
  { url: "https://www.motor.com/feed/", source: "MOTOR", fallback: "Repair & Maintenance", max: 10 },
  { url: "https://www.motor1.com/rss/news/all/", source: "Motor1", fallback: "New Cars", max: 10 },
  { url: "https://www.caranddriver.com/rss/all.xml/", source: "Car and Driver", fallback: "New Cars", max: 10 },
  { url: "https://www.autoweek.com/rss/all.xml/", source: "Autoweek", fallback: "Car Culture", max: 8 },
  { url: "https://www.carscoops.com/feed/", source: "Carscoops", fallback: "New Cars", max: 8 },
  { url: "https://www.thedrive.com/feed", source: "The Drive", fallback: "Car Culture", max: 8 },
  { url: "https://insideevs.com/rss/news/all/", source: "InsideEVs", fallback: "Electric Vehicles", max: 10 },
  { url: "https://jalopnik.com/rss", source: "Jalopnik", fallback: "Car Culture", max: 8 },
  { url: "https://www.autoblog.com/rss.xml", source: "Autoblog", fallback: "New Cars", max: 8 },
  { url: "https://www.greencarreports.com/rss.xml", source: "Green Car Reports", fallback: "Electric Vehicles", max: 8 },
  { url: "https://www.hagerty.com/media/feed/", source: "Hagerty", fallback: "Car Culture", max: 8 },
];

const RULES: [AutoNewsCategory, RegExp][] = [
  ["Recalls & Safety", /\b(recall|safety defect|nhtsa|crash test|airbag|takata|stop-?sale|investigation)\b/i],
  ["Electric Vehicles", /\b(\bev\b|electric vehicle|battery pack|charging|charger|hybrid|plug-?in|lithium|tesla|rivian|lucid)\b/i],
  ["Tools & Equipment", /\b(scan tool|obd|torque wrench|multimeter|oscilloscope|lift\b|tool review|toolbox|equipment)\b/i],
  ["Diagnostics", /\b(diagnos|troubleshoot|fault code|dtc\b|check engine|misfire|no-?start|wiring diagram|pico|scope)\b/i],
  ["Repair & Maintenance", /\b(repair|maintenance|service|brake|transmission|engine|suspension|oil change|timing|coolant|technician|mechanic|fix)\b/i],
  ["Shop Business", /\b(shop|dealership|technician shortage|labor rate|labor time|parts|warranty|estimate|customer pay|aftermarket|collision)\b/i],
  ["Car Culture", /\b(classic|restoration|muscle car|jdm|tuner|motorsport|racing|rally|concept|auction|enthusiast)\b/i],
  ["New Cars", /\b(unveil|debut|first drive|review|202[5-9]|spy shot|pricing|msrp|trims?)\b/i],
];

function entities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/g, "'")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8212;|&mdash;/g, ", ")
    .replace(/&hellip;|&#8230;/g, "...")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function decode(input: string): string {
  const unwrapped = input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return entities(entities(unwrapped).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? (match[1] ?? null) : null;
}

function attr(block: string, pattern: RegExp): string | null {
  const match = block.match(pattern);
  return match ? (match[1] ?? null) : null;
}

function findLink(block: string): string | null {
  const plain = tag(block, "link");
  if (plain) {
    const value = decode(plain);
    if (value.startsWith("http")) return value;
  }
  const href = attr(block, /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
    ?? attr(block, /<link[^>]*href=["']([^"']+)["']/i);
  return href ?? null;
}

function findImage(block: string): string | null {
  const direct =
    attr(block, /<media:content[^>]*url=["']([^"']+)["']/i) ??
    attr(block, /<media:thumbnail[^>]*url=["']([^"']+)["']/i) ??
    attr(block, /<enclosure[^>]*url=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i) ??
    attr(block, /<image[^>]*>\s*<url>([^<]+)<\/url>/i) ??
    attr(block, /src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i) ??
    attr(block, /<cover_image>([^<]+)<\/cover_image>/i);
  if (!direct) return null;
  const url = decode(direct);
  return url.startsWith("http") ? url : null;
}

function categorise(text: string, fallback: AutoNewsCategory): AutoNewsCategory {
  for (const [category, pattern] of RULES) {
    if (pattern.test(text)) return category;
  }
  return fallback;
}

function parseFeed(xml: string, feed: Feed): AutoNewsArticle[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  const out: AutoNewsArticle[] = [];
  for (const block of blocks.slice(0, feed.max ?? 14)) {
    const rawTitle = tag(block, "title");
    const url = findLink(block);
    if (!rawTitle || !url) continue;
    const title = decode(rawTitle);
    if (!title) continue;
    const rawSummary =
      tag(block, "description") ?? tag(block, "summary") ?? tag(block, "content:encoded") ?? tag(block, "content") ?? "";
    const summary = decode(rawSummary).slice(0, 320);
    const rawDate =
      tag(block, "pubDate") ?? tag(block, "published") ?? tag(block, "updated") ?? tag(block, "dc:date") ?? "";
    const parsed = rawDate ? Date.parse(decode(rawDate)) : NaN;
    if (Number.isNaN(parsed)) continue;
    out.push({
      id: url,
      title,
      summary,
      url,
      image: findImage(block),
      source: feed.source,
      category: categorise(`${title} ${summary}`, feed.fallback),
      publishedAt: new Date(parsed).toISOString(),
    });
  }
  return out;
}

async function loadFeed(feed: Feed): Promise<AutoNewsArticle[]> {
  try {
    const response = await fetch(feed.url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ITPathReader/1.0)",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return [];
    return parseFeed(await response.text(), feed);
  } catch {
    return [];
  }
}

let cache: { at: number; articles: AutoNewsArticle[] } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export const getAutoNews = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.articles;
  const results = await Promise.all(FEEDS.map(loadFeed));
  const seen = new Set<string>();
  const articles = results
    .flat()
    .filter((article) => {
      const key = article.title.toLowerCase();
      if (seen.has(key) || seen.has(article.url)) return false;
      seen.add(key);
      seen.add(article.url);
      return true;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 250);
  if (articles.length > 0) cache = { at: Date.now(), articles };
  return articles;
});

/**
 * Deeper pages come from public automotive communities on Reddit. Each
 * community's listing is paged with its own `after` token, so the feed keeps
 * going as far back as the community does. Every card links to the original
 * discussion.
 */
const COMMUNITIES = [
  { sub: "MechanicAdvice", label: "r/MechanicAdvice", fallback: "Repair & Maintenance" as AutoNewsCategory },
  { sub: "Justrolledintotheshop", label: "r/JustRolledIntoTheShop", fallback: "Repair & Maintenance" as AutoNewsCategory },
  { sub: "Cartalk", label: "r/Cartalk", fallback: "Diagnostics" as AutoNewsCategory },
  { sub: "cars", label: "r/cars", fallback: "Car Culture" as AutoNewsCategory },
];

interface RedditPost {
  data?: {
    name?: string;
    title?: string;
    selftext?: string;
    url?: string;
    permalink?: string;
    thumbnail?: string;
    created_utc?: number;
    is_self?: boolean;
    stickied?: boolean;
    score?: number;
  };
}

export interface AutoNewsPage {
  articles: AutoNewsArticle[];
  /** Opaque cursor the client hands back unchanged; null ends the feed. */
  nextCursor: string | null;
}

function encodeCursor(index: number, after: string | null): string {
  return `${index}:${after ?? ""}`;
}

function decodeCursor(raw: unknown): { index: number; after: string } {
  if (typeof raw !== "string") return { index: 0, after: "" };
  const [indexPart, after = ""] = raw.split(":");
  const index = Number(indexPart);
  if (!Number.isInteger(index) || index < 0 || index >= COMMUNITIES.length) return { index: 0, after: "" };
  return { index, after };
}

export const getAutoNewsPage = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const cursor = (data as { cursor?: unknown } | undefined)?.cursor;
    return { cursor: typeof cursor === "string" ? cursor.slice(0, 200) : "" };
  })
  .handler(async ({ data }): Promise<AutoNewsPage> => {
    const { index, after } = decodeCursor(data.cursor);
    const community = COMMUNITIES[index];
    if (!community) return { articles: [], nextCursor: null };
    const params = new URLSearchParams({ limit: "24", raw_json: "1" });
    if (after) params.set("after", after);
    try {
      const response = await fetch(`https://www.reddit.com/r/${community.sub}/hot.json?${params.toString()}`, {
        headers: { "user-agent": "ITPathReader/1.0 (automotive study app)", accept: "application/json" },
        signal: AbortSignal.timeout(9000),
      });
      if (!response.ok) {
        // Skip a community that refuses and keep the feed alive.
        const next = index + 1;
        return next < COMMUNITIES.length
          ? { articles: [], nextCursor: encodeCursor(next, null) }
          : { articles: [], nextCursor: null };
      }
      const body = (await response.json()) as { data?: { children?: RedditPost[]; after?: string | null } };
      const articles: AutoNewsArticle[] = [];
      for (const post of body.data?.children ?? []) {
        const item = post.data;
        const title = item?.title?.trim();
        const name = item?.name;
        const created = item?.created_utc ? item.created_utc * 1000 : NaN;
        if (!item || !title || !name || Number.isNaN(created) || item.stickied) continue;
        const url = item.permalink ? `https://www.reddit.com${item.permalink}` : (item.url ?? "");
        if (!url) continue;
        const summary = (item.selftext ?? "").replace(/\s+/g, " ").trim().slice(0, 320);
        const thumbnail = item.thumbnail && item.thumbnail.startsWith("http") ? item.thumbnail : null;
        articles.push({
          id: `reddit:${name}`,
          title,
          summary,
          url,
          image: thumbnail,
          source: community.label,
          category: categorise(`${title} ${summary}`, community.fallback),
          publishedAt: new Date(created).toISOString(),
        });
      }
      const afterToken = body.data?.after ?? null;
      if (afterToken && articles.length > 0) {
        return { articles, nextCursor: encodeCursor(index, afterToken) };
      }
      const next = index + 1;
      return next < COMMUNITIES.length
        ? { articles, nextCursor: encodeCursor(next, null) }
        : { articles, nextCursor: null };
    } catch {
      return { articles: [], nextCursor: null };
    }
  });
