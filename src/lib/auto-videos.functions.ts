import { createServerFn } from "@tanstack/react-start";

export type AutoVideoCategory =
  | "Diagnostics"
  | "Repair How-To"
  | "Electrical"
  | "Engine & Drivetrain"
  | "EV & Hybrid"
  | "Tool Reviews"
  | "Builds & Restoration"
  | "Industry News";

export const AUTO_VIDEO_CATEGORIES: AutoVideoCategory[] = [
  "Diagnostics",
  "Repair How-To",
  "Electrical",
  "Engine & Drivetrain",
  "EV & Hybrid",
  "Tool Reviews",
  "Builds & Restoration",
  "Industry News",
];

export interface AutoVideo {
  id: string;
  /** Platform video id used by the official embed player. */
  videoId: string;
  /** Full embed URL on the platform that published the video. */
  embedUrl: string;
  title: string;
  summary: string;
  /** Link to the video on the platform it was published on. */
  url: string;
  channelUrl: string;
  channel: string;
  thumbnail: string;
  category: AutoVideoCategory;
  publishedAt: string;
}

/**
 * Only public, official channel feeds are used. Nothing is downloaded or
 * re-hosted: metadata comes from YouTube's own feed and playback happens in
 * YouTube's own player, so creators keep their views and their adverts.
 */
interface Channel {
  id: string;
  name: string;
  fallback: AutoVideoCategory;
}

const CHANNELS: Channel[] = [
  { id: "UCrf6f8hn5oy4alB2WXJCIqA", name: "ScannerDanner", fallback: "Diagnostics" },
  { id: "UCNZty_jKwN_LJ6oNBcDlWig", name: "South Main Auto Repair", fallback: "Diagnostics" },
  { id: "UCa7guRnhniICnS0mJbSDmMg", name: "EricTheCarGuy", fallback: "Repair How-To" },
  { id: "UChCd17oKbPA1yIfv4Cb_RSw", name: "ChrisFix", fallback: "Repair How-To" },
  { id: "UClqhvGmHcvWL9w3R48t9QXQ", name: "Humble Mechanic", fallback: "Repair How-To" },
  { id: "UCsrY4q8xGPJQbQ8HPQZn6iA", name: "Engineering Explained", fallback: "Engine & Drivetrain" },
  { id: "UCxucfRWANaT8tfz97lAf8hw", name: "WeberAuto", fallback: "EV & Hybrid" },
  { id: "UCuxpxCCevIlF-k-K5YU8XPA", name: "Scotty Kilmer", fallback: "Repair How-To" },
  { id: "UCL6JmiMXKoXS6bpP1D3bk8g", name: "Donut Media", fallback: "Builds & Restoration" },
  { id: "UCt9IKGnSVz5T-cVpwOnicqQ", name: "Pine Hollow Auto Diagnostics", fallback: "Diagnostics" },
];

/**
 * Channel directory used when the public feed cannot be reached. Each channel's
 * uploads playlist is played in YouTube's own player, so the newest videos from
 * that creator are always available even with no feed metadata.
 */
export interface AutoChannelInfo {
  id: string;
  name: string;
  category: AutoVideoCategory;
  uploadsPlaylistId: string;
  channelUrl: string;
}

export const AUTO_CHANNEL_DIRECTORY: AutoChannelInfo[] = CHANNELS.map((channel) => ({
  id: channel.id,
  name: channel.name,
  category: channel.fallback,
  uploadsPlaylistId: `UU${channel.id.slice(2)}`,
  channelUrl: `https://www.youtube.com/channel/${channel.id}`,
}));

const RULES: [AutoVideoCategory, RegExp][] = [
  ["Electrical", /\b(wiring|electrical|voltage|parasitic draw|battery|alternator|starter|relay|fuse|short circuit|multimeter|oscilloscope|scope|can bus|module)\b/i],
  ["Diagnostics", /\b(diagnos|troubleshoot|fault code|dtc|p0\d{3}|check engine|misfire|no start|no-?crank|scan tool|obd|freeze frame|live data|case study)\b/i],
  ["EV & Hybrid", /\b(\bev\b|electric vehicle|hybrid|battery pack|inverter|regenerative|charging|high voltage)\b/i],
  ["Tool Reviews", /\b(tool|wrench|ratchet|socket|impact|torque|lift\b|toolbox|unboxing|review)\b/i],
  ["Builds & Restoration", /\b(build|restoration|project car|swap\b|turbo\b|supercharg|widebody|dyno|track car|drift)\b/i],
  ["Industry News", /\b(news|recall|industry|dealership|technician shortage|labor|202[5-9] model|announce)\b/i],
  ["Repair How-To", /\b(how to|replace|install|repair|service|brake|oil|suspension|transmission|timing|coolant|maintenance|fix)\b/i],
  ["Engine & Drivetrain", /\b(engine|drivetrain|transmission|clutch|differential|cylinder|piston|camshaft|crankshaft|fuel system|exhaust)\b/i],
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

function categorise(text: string, fallback: AutoVideoCategory): AutoVideoCategory {
  for (const [category, pattern] of RULES) {
    if (pattern.test(text)) return category;
  }
  return fallback;
}

function parseChannelFeed(xml: string, channel: Channel): AutoVideo[] {
  const blocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const out: AutoVideo[] = [];
  for (const block of blocks.slice(0, 15)) {
    const videoId = tag(block, "yt:videoId");
    const rawTitle = tag(block, "title");
    const rawDate = tag(block, "published") ?? tag(block, "updated");
    if (!videoId || !rawTitle || !rawDate) continue;
    const id = decode(videoId);
    const title = decode(rawTitle);
    const published = Date.parse(decode(rawDate));
    if (!id || !title || Number.isNaN(published)) continue;
    const summary = decode(tag(block, "media:description") ?? "").slice(0, 280);
    out.push({
      id: `youtube:${id}`,
      videoId: id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
      title,
      summary,
      url: `https://www.youtube.com/watch?v=${id}`,
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      channel: channel.name,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      category: categorise(`${title} ${summary}`, channel.fallback),
      publishedAt: new Date(published).toISOString(),
    });
  }
  return out;
}

async function loadChannel(channel: Channel): Promise<AutoVideo[]> {
  try {
    const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ITPathReader/1.0)",
        accept: "application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return [];
    return parseChannelFeed(await response.text(), channel);
  } catch {
    return [];
  }
}

let cache: { at: number; videos: AutoVideo[] } | null = null;
const CACHE_MS = 15 * 60 * 1000;

export const getAutoVideos = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.videos;
  const results = await Promise.all(CHANNELS.map(loadChannel));
  const seen = new Set<string>();
  const videos = results
    .flat()
    .filter((video) => {
      if (seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 160);
  if (videos.length > 0) cache = { at: Date.now(), videos };
  return videos;
});

/**
 * One page of the endless feed. YouTube channel feeds are not paged, so each
 * page asks a rotating window of channels for their latest uploads; deeper
 * pages revisit channels and the client deduplicates, while the IntersectionObserver
 * keeps the feed moving. A page that comes back empty ends the feed.
 */
const PAGE_CHANNELS = 4;
const MAX_PAGES = 24;

export interface AutoVideoPage {
  videos: AutoVideo[];
  nextPage: number | null;
}

export const getAutoVideoPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const page = Number((data as { page?: unknown } | undefined)?.page ?? 0);
    return { page: Number.isFinite(page) && page > 0 ? Math.min(Math.floor(page), MAX_PAGES) : 0 };
  })
  .handler(async ({ data }): Promise<AutoVideoPage> => {
    if (data.page >= MAX_PAGES) return { videos: [], nextPage: null };
    const start = (data.page * PAGE_CHANNELS) % CHANNELS.length;
    const batch: Channel[] = [];
    for (let i = 0; i < PAGE_CHANNELS; i++) {
      batch.push(CHANNELS[(start + i) % CHANNELS.length]!);
    }
    const results = await Promise.all(batch.map(loadChannel));
    const seen = new Set<string>();
    const videos = results
      .flat()
      .filter((video) => {
        if (seen.has(video.id)) return false;
        seen.add(video.id);
        return true;
      })
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    return { videos, nextPage: videos.length > 0 ? data.page + 1 : null };
  });
