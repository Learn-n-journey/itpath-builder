import { createServerFn } from "@tanstack/react-start";

/**
 * Live IT job listings aggregated from public job-board APIs that need no
 * account or key. Everything is fetched server side, cached briefly, and the
 * listing always links out to the original posting on the board it came from.
 * Nothing here touches the learning system.
 */

export interface TechJob {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  source: string;
  url: string;
  postedAt: string;
  tags: string[];
  /** Certifications mentioned in the posting, matched to names IT PATH teaches. */
  certifications: string[];
}

export const JOB_CERTIFICATIONS = [
  "CompTIA A+",
  "CompTIA Network+",
  "CompTIA Security+",
  "CompTIA Linux+",
  "CompTIA Cloud+",
  "CompTIA CySA+",
  "CompTIA PenTest+",
  "CompTIA Server+",
  "Cisco CCNA",
  "AWS",
  "Microsoft Azure",
  "CISSP",
] as const;

const CERT_PATTERNS: { cert: string; pattern: RegExp }[] = [
  { cert: "CompTIA A+", pattern: /\bcomptia\s*a\+\b|\ba\+\s*certif/i },
  { cert: "CompTIA Network+", pattern: /\bnetwork\+\b/i },
  { cert: "CompTIA Security+", pattern: /\bsecurity\+\b/i },
  { cert: "CompTIA Linux+", pattern: /\blinux\+\b/i },
  { cert: "CompTIA Cloud+", pattern: /\bcloud\+\b/i },
  { cert: "CompTIA CySA+", pattern: /\bcysa\+\b/i },
  { cert: "CompTIA PenTest+", pattern: /\bpentest\+\b/i },
  { cert: "CompTIA Server+", pattern: /\bserver\+\b/i },
  { cert: "Cisco CCNA", pattern: /\bccna\b/i },
  { cert: "AWS", pattern: /\baws\b|\bamazon web services\b/i },
  { cert: "Microsoft Azure", pattern: /\bazure\b/i },
  { cert: "CISSP", pattern: /\bcissp\b/i },
];

function detectCertifications(text: string): string[] {
  return CERT_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ cert }) => cert);
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const IT_HINTS =
  /\b(it|technician|support|help\s?desk|service\s?desk|network|systems?|administrator|sysadmin|security|cyber|soc|analyst|cloud|devops|linux|windows|infrastructure|noc|data\s?center|hardware|desktop|field\s?service|operations|engineer)\b/i;

/** Boards return every trade; keep only roles that belong to IT. */
function isItJob(title: string, tags: string[]): boolean {
  return IT_HINTS.test(title) || tags.some((tag) => IT_HINTS.test(tag));
}

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location?: string;
  url: string;
  publication_date?: string;
  description?: string;
  tags?: string[];
}

interface ArbeitnowJob {
  slug: string;
  title: string;
  company_name: string;
  location?: string;
  remote?: boolean;
  url: string;
  created_at?: number;
  description?: string;
  tags?: string[];
}

async function fetchRemotive(): Promise<TechJob[]> {
  const searches = ["it support", "help desk", "network", "system administrator", "cyber security"];
  const jobs: TechJob[] = [];
  for (const search of searches) {
    try {
      const res = await fetch(
        `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(search)}&limit=40`,
        { signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) continue;
      const payload = (await res.json()) as { jobs?: RemotiveJob[] };
      for (const job of payload.jobs ?? []) {
        const text = `${job.title} ${stripHtml(job.description ?? "")}`;
        const location = job.candidate_required_location?.trim() || "Remote";
        jobs.push({
          id: `remotive-${job.id}`,
          title: job.title,
          company: job.company_name,
          location,
          remote: true,
          source: "Remotive",
          url: job.url,
          postedAt: job.publication_date ?? new Date().toISOString(),
          tags: job.tags ?? [],
          certifications: detectCertifications(text),
        });
      }
    } catch {
      // One source failing must not empty the board.
    }
  }
  return jobs.filter((job) => isItJob(job.title, job.tags));
}

async function fetchArbeitnow(): Promise<TechJob[]> {
  const jobs: TechJob[] = [];
  try {
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const payload = (await res.json()) as { data?: ArbeitnowJob[] };
      for (const job of payload.data ?? []) {
        const text = `${job.title} ${stripHtml(job.description ?? "")}`;
        jobs.push({
          id: `arbeitnow-${job.slug}`,
          title: job.title,
          company: job.company_name,
          location: job.remote ? `Remote${job.location ? ` · ${job.location}` : ""}` : job.location || "Not stated",
          remote: Boolean(job.remote),
          source: "Arbeitnow",
          url: job.url,
          postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
          tags: job.tags ?? [],
          certifications: detectCertifications(text),
        });
      }
    }
  } catch {
    // One source failing must not empty the board.
  }
  return jobs.filter((job) => isItJob(job.title, job.tags));
}

let cache: { at: number; jobs: TechJob[] } | undefined;
const CACHE_MS = 15 * 60 * 1000;

export const getTechJobs = createServerFn({ method: "GET" }).handler(async (): Promise<TechJob[]> => {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.jobs;

  const settled = await Promise.all([fetchRemotive(), fetchArbeitnow()]);
  const seen = new Set<string>();
  const jobs = settled
    .flat()
    .filter((job) => {
      const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt))
    .slice(0, 300);

  if (jobs.length > 0) cache = { at: Date.now(), jobs };
  return jobs.length > 0 ? jobs : (cache?.jobs ?? []);
});
