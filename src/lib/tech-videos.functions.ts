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
  | "Troubleshooting";

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
];

export interface TechVideo {
  id: string;
  /** Platform video id used by the official embed player. */
  videoId: string;
  platform: "YouTube";
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
];

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
