import { createServerFn } from "@tanstack/react-start";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  image: string | null;
  source: string;
  category: NewsCategory;
  publishedAt: string;
}

export type NewsCategory =
  | "AI"
  | "Cybersecurity"
  | "Hardware"
  | "Networking"
  | "Windows"
  | "Linux"
  | "Cloud"
  | "Programming"
  | "Mobile"
  | "IT Careers"
  | "Releases"
  | "Outages";

export const NEWS_CATEGORIES: NewsCategory[] = [
  "AI",
  "Cybersecurity",
  "Hardware",
  "Networking",
  "Windows",
  "Linux",
  "Cloud",
  "Programming",
  "Mobile",
  "IT Careers",
  "Releases",
  "Outages",
];

interface Feed {
  url: string;
  source: string;
  fallback: NewsCategory;
}

const FEEDS: Feed[] = [
  { url: "https://feeds.arstechnica.com/arstechnica/index", source: "Ars Technica", fallback: "Hardware" },
  { url: "https://www.theverge.com/rss/index.xml", source: "The Verge", fallback: "Hardware" },
  { url: "https://www.theregister.com/headlines.atom", source: "The Register", fallback: "IT Careers" },
  { url: "https://www.tomshardware.com/feeds/all", source: "Tom's Hardware", fallback: "Hardware" },
  { url: "https://www.phoronix.com/rss.php", source: "Phoronix", fallback: "Linux" },
  { url: "https://www.neowin.net/news/rss/", source: "Neowin", fallback: "Windows" },
  { url: "https://feeds.feedburner.com/TheHackersNews", source: "The Hacker News", fallback: "Cybersecurity" },
  { url: "https://krebsonsecurity.com/feed/", source: "Krebs on Security", fallback: "Cybersecurity" },
  { url: "https://www.itpro.com/feeds/all", source: "ITPro", fallback: "IT Careers" },
  { url: "https://aws.amazon.com/blogs/aws/feed/", source: "AWS News", fallback: "Cloud" },
  { url: "https://blog.google/technology/ai/rss/", source: "Google AI", fallback: "AI" },
  { url: "https://dev.to/feed", source: "DEV Community", fallback: "Programming" },
];

const RULES: [NewsCategory, RegExp][] = [
  ["Outages", /\b(outage|downtime|disrupt|service restored|degraded service|took down|knocked offline)\b/i],
  ["Cybersecurity", /\b(security|breach|ransomware|malware|vulnerab|exploit|cve-|phishing|hacker|zero.day|patch tuesday|botnet|spyware)\b/i],
  ["AI", /\b(\bai\b|artificial intelligence|machine learning|llm|gpt|gemini|copilot|anthropic|openai|model weights)\b/i],
  ["Linux", /\b(linux|kernel|ubuntu|debian|fedora|red hat|gnome|kde|systemd|open source)\b/i],
  ["Windows", /\b(windows|microsoft 365|azure ad|entra|powershell|surface)\b/i],
  ["Cloud", /\b(cloud|aws|azure|google cloud|kubernetes|container|serverless|saas|data ?cent(re|er))\b/i],
  ["Networking", /\b(network|router|wi-?fi|5g|broadband|dns|bgp|ethernet|fibre|fiber optic|vpn)\b/i],
  ["Mobile", /\b(iphone|android|ipad|smartphone|pixel|galaxy|ios \d|tablet|wearable)\b/i],
  ["Programming", /\b(developer|programming|javascript|typescript|python|rust|golang|api|framework|compiler|code|git)\b/i],
  ["Hardware", /\b(cpu|gpu|processor|motherboard|ssd|ram|laptop|chip|nvidia|amd|intel|arm\b|storage drive)\b/i],
  ["Releases", /\b(launch|released|announc|unveil|now available|general availability|version \d)\b/i],
  ["IT Careers", /\b(jobs|hiring|layoff|salary|skills gap|certification|recruit|workforce)\b/i],
];

function decode(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
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
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string | null {
  const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return match ? match[1] : null;
}

function attr(block: string, pattern: RegExp): string | null {
  const match = block.match(pattern);
  return match ? match[1] : null;
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

function categorise(text: string, fallback: NewsCategory): NewsCategory {
  for (const [category, pattern] of RULES) {
    if (pattern.test(text)) return category;
  }
  return fallback;
}

function parseFeed(xml: string, feed: Feed): NewsArticle[] {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
  const out: NewsArticle[] = [];
  for (const block of blocks.slice(0, 25)) {
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

async function loadFeed(feed: Feed): Promise<NewsArticle[]> {
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

let cache: { at: number; articles: NewsArticle[] } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export const getTechNews = createServerFn({ method: "GET" }).handler(async () => {
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
    .slice(0, 150);
  if (articles.length > 0) cache = { at: Date.now(), articles };
  return articles;
});
