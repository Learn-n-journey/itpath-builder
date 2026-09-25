import { createServerFn } from "@tanstack/react-start";

export type VideoCategory =
  | "AI"
  | "Cybersecurity"
  | "Hardware"
  | "Networking"
  | "Linux"
  | "Windows"
  | "Cloud"
  | "Programming"
  | "IT Careers"
  | "Tech News"
  | "Troubleshooting"
  | "Automotive";

export const VIDEO_CATEGORIES: VideoCategory[] = [
  "AI",
  "Cybersecurity",
  "Hardware",
  "Networking",
  "Linux",
  "Windows",
  "Cloud",
  "Programming",
  "IT Careers",
  "Tech News",
  "Troubleshooting",
  "Automotive",
];

export type VideoPlatform = "YouTube" | "PeerTube";

export interface TechVideo {
  id: string;
  /** Platform video id used by the official embed player. */
  videoId: string;
  platform: VideoPlatform;
  /** Full embed URL on the platform that published the video. */
  embedUrl: string;
  title: string;
  summary: string;
  /** Link to the video on the platform it was published on. */
  url: string;
  /** Link to the creator's own page on that platform. */
  channelUrl: string;
  channel: string;
  thumbnail: string;
  category: VideoCategory;
  publishedAt: string;
}

/**
 * Only public, official feeds are used. Nothing is downloaded or re-hosted:
 * metadata comes from the platform's own feed and playback happens in the
 * platform's own player, so creators keep their views and their adverts.
 */
interface Channel {
  /** Platform channel id, used with YouTube's public channel feed. */
  id: string;
  name: string;
  fallback: VideoCategory;
}

const CHANNELS: Channel[] = [
  { id: "UC9x0AN7BWHpCDHSm9NiJFJQ", name: "NetworkChuck", fallback: "Networking" },
  { id: "UCP7WmQ_U4GB3K51Od9QvM0w", name: "David Bombal", fallback: "Networking" },
  { id: "UCVS6ejD9NLZvjsvhcbiDzjw", name: "Crosstalk Solutions", fallback: "Networking" },
  { id: "UCkefXKtInZ9PLsoGRtml2FQ", name: "Professor Messer", fallback: "IT Careers" },
  { id: "UCgTNupxATBfWmfehv21ym-g", name: "Null Byte", fallback: "Cybersecurity" },
  { id: "UC2uPNhGken-ogEpJDi4ly6w", name: "SANS Institute", fallback: "Cybersecurity" },
  { id: "UC0ArlFuFYMpEewyRBzdLHiw", name: "TCM Security", fallback: "Cybersecurity" },
  { id: "UCXuqSBlHAE6Xw-yeJA0Tunw", name: "Linus Tech Tips", fallback: "Hardware" },
  { id: "UCR-DXc1voovS8nhAvccRZhg", name: "Jeff Geerling", fallback: "Hardware" },
  { id: "UCxQKHvKbmSzGMvUrVtJYnUA", name: "Learn Linux TV", fallback: "Linux" },
  { id: "UCMiyV_Ib77XLpzHPQH_q0qQ", name: "Veronica Explains", fallback: "Linux" },
  { id: "UC5UAwBUum7CPN5buc-_N1Fw", name: "The Linux Experiment", fallback: "Linux" },
  { id: "UCQSpnDG3YsFNf5-qHocF-WQ", name: "ThioJoe", fallback: "Windows" },
  { id: "UC_M-iWYpQbgo4rK1YfewI5w", name: "Britec09", fallback: "Troubleshooting" },
  { id: "UCJS9pqu9BzkAMNTmzNMNhvg", name: "Google Cloud Tech", fallback: "Cloud" },
  { id: "UCKWaEZ-_VweaEx1j62do_vQ", name: "IBM Technology", fallback: "AI" },
  { id: "UCbfYPyITQ-7l4upoX8nvctg", name: "Two Minute Papers", fallback: "AI" },
  { id: "UC4JX40jDee_tINbkjycV4Sg", name: "Tech With Tim", fallback: "Programming" },
  { id: "UC8ENHE5xdFSwx71u3fDH5Xw", name: "ThePrimeagen", fallback: "Programming" },
  { id: "UC9-y-6csu5WGm29I7JiwpnA", name: "Computerphile", fallback: "Programming" },
  { id: "UC_x5XG1OV2P6uZZ5FSM9Ttw", name: "Google for Developers", fallback: "Programming" },
  { id: "UCrf6f8hn5oy4alB2WXJCIqA", name: "ScannerDanner", fallback: "Automotive" },
  { id: "UCa7guRnhniICnS0mJbSDmMg", name: "EricTheCarGuy", fallback: "Automotive" },
  { id: "UCNZty_jKwN_LJ6oNBcDlWig", name: "South Main Auto Repair", fallback: "Automotive" },
  { id: "UCxucfRWANaT8tfz97lAf8hw", name: "WeberAuto", fallback: "Automotive" },
  { id: "UCsrY4q8xGPJQbQ8HPQZn6iA", name: "Engineering Explained", fallback: "Automotive" },
  { id: "UChCd17oKbPA1yIfv4Cb_RSw", name: "ChrisFix", fallback: "Automotive" },
  { id: "UClqhvGmHcvWL9w3R48t9QXQ", name: "Humble Mechanic", fallback: "Automotive" },
];

/**
 * Channel directory used when the public feed cannot be reached. Each channel's
 * uploads playlist is played in YouTube's own player, so the newest videos from
 * that creator are always available even with no feed metadata.
 */
export interface ChannelInfo {
  id: string;
  name: string;
  category: VideoCategory;
  uploadsPlaylistId: string;
  channelUrl: string;
}

export const CHANNEL_DIRECTORY: ChannelInfo[] = CHANNELS.map((channel) => ({
  id: channel.id,
  name: channel.name,
  category: channel.fallback,
  uploadsPlaylistId: `UU${channel.id.slice(2)}`,
  channelUrl: `https://www.youtube.com/channel/${channel.id}`,
}));

const RULES: [VideoCategory, RegExp][] = [
  ["Troubleshooting", /\b(fix|troubleshoot|repair|blue screen|bsod|won'?t boot|not working|error code|diagnose|slow pc)\b/i],
  ["Cybersecurity", /\b(security|hack|malware|ransomware|phish|exploit|vulnerab|pentest|cve-|firewall|soc analyst|red team|blue team)\b/i],
  ["AI", /\b(\bai\b|artificial intelligence|machine learning|neural|llm|gpt|gemini|copilot|diffusion|model training)\b/i],
  ["Linux", /\b(linux|ubuntu|debian|fedora|arch\b|kernel|bash\b|systemd|gnome|kde|open source)\b/i],
  ["Windows", /\b(windows 1[01]|windows server|microsoft 365|registry|powershell|active directory|winget|group policy)\b/i],
  ["Cloud", /\b(cloud|aws|azure|gcp|google cloud|kubernetes|docker|container|serverless|terraform)\b/i],
  ["Networking", /\b(network|router|switch|wi-?fi|vlan|bgp|dns|subnet|firewall rule|packet|cisco|ccna|fibre|fiber)\b/i],
  ["Programming", /\b(code|coding|programming|python|javascript|typescript|rust\b|golang|api\b|developer|git\b|database|sql)\b/i],
  ["Hardware", /\b(cpu|gpu|motherboard|ssd|ram\b|pc build|laptop|raspberry pi|server build|cooling|psu\b)\b/i],
  ["IT Careers", /\b(career|job|interview|resume|cv\b|certification|comptia|salary|help ?desk|entry level)\b/i],
  ["Tech News", /\b(news|announce|released|launch|this week|roundup|update\b)\b/i],
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

function categorise(text: string, fallback: VideoCategory): VideoCategory {
  for (const [category, pattern] of RULES) {
    if (pattern.test(text)) return category;
  }
  return fallback;
}

function parseChannelFeed(xml: string, channel: Channel): TechVideo[] {
  const blocks = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const out: TechVideo[] = [];
  for (const block of blocks.slice(0, 12)) {
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
      platform: "YouTube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
      title,
      summary,
      url: `https://www.youtube.com/watch?v=${id}`,
      channelUrl: `https://www.youtube.com/channel/${channel.id}`,
      channel: channel.name,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      // Automotive channels keep their own category; the IT keyword rules do not apply to them.
      category: channel.fallback === "Automotive" ? "Automotive" : categorise(`${title} ${summary}`, channel.fallback),
      publishedAt: new Date(published).toISOString(),
    });
  }
  return out;
}

async function loadChannel(channel: Channel): Promise<TechVideo[]> {
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

let cache: { at: number; videos: TechVideo[] } | null = null;
const CACHE_MS = 15 * 60 * 1000;

export const getTechVideos = createServerFn({ method: "GET" }).handler(async () => {
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

export interface VideoSearchResult {
  id: string;
  videoId: string;
  title: string;
  summary: string;
  channel: string;
  channelUrl: string;
  thumbnail: string;
  url: string;
  embedUrl: string;
  publishedAt: string;
  source: "YouTube search" | "Trusted video feed";
}

const searchCache = new Map<string, { at: number; videos: VideoSearchResult[] }>();
const SEARCH_CACHE_MS = 60 * 60 * 1000;

function searchText(video: TechVideo): string {
  return `${video.title} ${video.summary} ${video.channel} ${video.category}`.toLowerCase();
}

export const searchLearningVideos = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const query = String((data as { query?: unknown } | undefined)?.query ?? "").trim().slice(0, 100);
    return { query };
  })
  .handler(async ({ data }): Promise<VideoSearchResult[]> => {
    if (data.query.length < 2) return [];
    const key = data.query.toLowerCase();
    const cached = searchCache.get(key);
    if (cached && Date.now() - cached.at < SEARCH_CACHE_MS) return cached.videos;

    const apiKey = process.env.YOUTUBE_API_KEY?.trim();
    if (apiKey) {
      const params = new URLSearchParams({
        part: "snippet",
        type: "video",
        q: `${data.query} tutorial explained`,
        maxResults: "8",
        relevanceLanguage: "en",
        safeSearch: "strict",
        videoEmbeddable: "true",
        order: "relevance",
        key: apiKey,
      });
      try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(9000),
        });
        if (response.ok) {
          const body = (await response.json()) as {
            items?: Array<{
              id?: { videoId?: string };
              snippet?: {
                title?: string;
                description?: string;
                channelId?: string;
                channelTitle?: string;
                publishedAt?: string;
                thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
              };
            }>;
          };
          const videos = (body.items ?? []).flatMap((item): VideoSearchResult[] => {
            const videoId = item.id?.videoId;
            const snippet = item.snippet;
            if (!videoId || !snippet?.title) return [];
            return [{
              id: `youtube-search:${videoId}`,
              videoId,
              title: entities(snippet.title),
              summary: entities(snippet.description ?? "").slice(0, 220),
              channel: entities(snippet.channelTitle ?? "YouTube"),
              channelUrl: snippet.channelId ? `https://www.youtube.com/channel/${snippet.channelId}` : "https://www.youtube.com/",
              thumbnail: snippet.thumbnails?.high?.url ?? snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`,
              publishedAt: snippet.publishedAt ?? "",
              source: "YouTube search",
            }];
          });
          if (videos.length > 0) {
            searchCache.set(key, { at: Date.now(), videos });
            return videos;
          }
        }
      } catch {
        // Fall through to the trusted channel feed when YouTube search is unavailable.
      }
    }

    const trusted = (await getTechVideos())
      .map((video) => ({ video, score: key.split(/\s+/).filter((word) => word.length > 1 && searchText(video).includes(word)).length }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || Date.parse(b.video.publishedAt) - Date.parse(a.video.publishedAt))
      .slice(0, 8)
      .map(({ video }): VideoSearchResult => ({
        id: video.id,
        videoId: video.videoId,
        title: video.title,
        summary: video.summary,
        channel: video.channel,
        channelUrl: video.channelUrl,
        thumbnail: video.thumbnail,
        url: video.url,
        embedUrl: video.embedUrl.replace("autoplay=1", "autoplay=0"),
        publishedAt: video.publishedAt,
        source: "Trusted video feed",
      }));
    searchCache.set(key, { at: Date.now(), videos: trusted });
    return trusted;
  });

/**
 * Additional public video services. These are PeerTube instances, which publish
 * an open listing API and their own embed player, so every video keeps its
 * original home, creator credit and player.
 */
const PEERTUBE_HOSTS = ["tilvids.com", "peertube.tv", "framatube.org", "makertube.net"] as const;

/** Science & Technology in PeerTube's shared category list. */
const PEERTUBE_TECH_CATEGORY = 15;
const PER_HOST = 8;

interface PeerTubeVideo {
  uuid?: string;
  shortUUID?: string;
  name?: string;
  truncatedDescription?: string | null;
  description?: string | null;
  thumbnailPath?: string | null;
  embedPath?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  isLive?: boolean;
  nsfw?: boolean;
  channel?: { displayName?: string; url?: string; name?: string; host?: string } | null;
}

async function loadPeerTube(host: string, page: number): Promise<TechVideo[]> {
  const params = new URLSearchParams({
    categoryOneOf: String(PEERTUBE_TECH_CATEGORY),
    languageOneOf: "en",
    nsfw: "false",
    sort: "-publishedAt",
    start: String(page * PER_HOST),
    count: String(PER_HOST),
  });
  try {
    const response = await fetch(`https://${host}/api/v1/videos?${params.toString()}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(9000),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as { data?: PeerTubeVideo[] };
    const out: TechVideo[] = [];
    for (const item of body.data ?? []) {
      const uuid = item.shortUUID ?? item.uuid;
      const title = item.name?.trim();
      const published = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
      if (!uuid || !title || Number.isNaN(published) || item.nsfw) continue;
      const summary = (item.truncatedDescription ?? item.description ?? "").replace(/\s+/g, " ").trim().slice(0, 280);
      const channelName = item.channel?.displayName?.trim() || host;
      out.push({
        id: `peertube:${host}:${uuid}`,
        videoId: uuid,
        platform: "PeerTube",
        embedUrl: `https://${host}${item.embedPath ?? `/videos/embed/${uuid}`}?autoplay=1`,
        title,
        summary,
        url: item.url ?? `https://${host}/w/${uuid}`,
        channelUrl: item.channel?.url ?? `https://${host}`,
        channel: channelName,
        thumbnail: item.thumbnailPath ? `https://${host}${item.thumbnailPath}` : "",
        category: categorise(`${title} ${summary}`, "Tech News"),
        publishedAt: new Date(published).toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export interface VideoPage {
  videos: TechVideo[];
  nextPage: number | null;
}

/**
 * One page of the endless feed. Page 0 also includes the YouTube listing when
 * it is reachable; every page pulls fresh videos from the other services.
 */
export const getVideoPage = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const page = Number((data as { page?: unknown } | undefined)?.page ?? 0);
    return { page: Number.isFinite(page) && page > 0 ? Math.min(Math.floor(page), 120) : 0 };
  })
  .handler(async ({ data }): Promise<VideoPage> => {
    const fromPeerTube = await Promise.all(PEERTUBE_HOSTS.map((host) => loadPeerTube(host, data.page)));
    const collected = fromPeerTube.flat();
    const seen = new Set<string>();
    const videos = collected
      .filter((video) => {
        if (seen.has(video.id)) return false;
        seen.add(video.id);
        return true;
      })
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    return { videos, nextPage: videos.length > 0 ? data.page + 1 : null };
  });
