import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { JOB_COUNTRIES, detectJobCountry, jobMatchesCountry } from "@/lib/job-countries";
import { boardListUrl, getLiveBoards, type DiscoveredBoard } from "@/lib/job-source-discovery";

/**
 * Live IT job listings aggregated from public job-board APIs that need no
 * account or key. Everything is fetched server side, cached briefly per
 * country, and every listing links out to the original posting on the board it
 * came from. Nothing here touches the learning system.
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
  /** ISO country code, or "ANY" when the posting is open worldwide. */
  country?: string | undefined;
  /** Certifications mentioned in the posting, matched to names IT PATH teaches. */
  certifications: string[];
}

export interface TechJobsResult {
  /** Country the listings were gathered for. */
  country: string;
  /** True when the country came from the visitor's connection rather than a choice. */
  detected: boolean;
  jobs: TechJob[];
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

/** Role searches used against boards that accept a title query. */
const ROLE_SEARCHES = [
  "it support",
  "help desk",
  "service desk",
  "desktop support",
  "technical support",
  "it technician",
  "network administrator",
  "network engineer",
  "systems administrator",
  "system engineer",
  "information security",
  "cyber security",
  "security analyst",
  "cloud engineer",
  "cloud administrator",
  "devops",
  "data center technician",
  "field service technician",
];

/** How many result pages to pull from boards that paginate. */
const PAGES_PER_SEARCH = 5;

const SUPPORTED_COUNTRY_CODES = new Set(JOB_COUNTRIES.map((c) => c.code));

export const DEFAULT_JOB_COUNTRY = "US";

function normaliseCountry(code: string | undefined | null): string | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return SUPPORTED_COUNTRY_CODES.has(upper) ? upper : undefined;
}

/** Country of the visitor, taken from edge headers when the host provides them. */
function countryFromRequest(): string | undefined {
  try {
    const headers = getRequest().headers;
    const candidates = [
      headers.get("cf-ipcountry"),
      headers.get("x-vercel-ip-country"),
      headers.get("x-country-code"),
      headers.get("x-geo-country"),
    ];
    for (const candidate of candidates) {
      const code = normaliseCountry(candidate);
      if (code) return code;
    }
  } catch {
    // No request context available (build time, tests).
  }
  return undefined;
}

// ---------------------------------------------------------------- sources

interface JobDataApiJob {
  id: number;
  title: string;
  company?: { name?: string } | null;
  location?: string | null;
  has_remote?: boolean;
  published?: string;
  description?: string;
  application_url?: string;
  countries?: { code?: string }[];
}

/**
 * jobdataapi.com indexes postings from company career sites and lets us ask for
 * one country at a time, so it carries on-site roles, not only remote work.
 */
async function fetchJobDataApi(country: string): Promise<TechJob[]> {
  /** Each search is asked for several pages, and every request runs at once. */
  const requests: Promise<TechJob[]>[] = [];
  for (const search of ROLE_SEARCHES) {
    for (let page = 1; page <= PAGES_PER_SEARCH; page += 1) {
      requests.push(
        (async () => {
          const jobs: TechJob[] = [];
          try {
            const res = await fetch(
              `https://jobdataapi.com/api/jobs/?country_code=${encodeURIComponent(country)}&title=${encodeURIComponent(search)}&page=${page}`,
              {
                signal: AbortSignal.timeout(12000),
                headers: { "User-Agent": "IT PATH study app (job board links)" },
              },
            );
            if (!res.ok) return jobs;
            const payload = (await res.json()) as { results?: JobDataApiJob[] };
            for (const job of payload.results ?? []) {
              if (!job.application_url || !job.title) continue;
              const text = `${job.title} ${stripHtml(job.description ?? "")}`;
              jobs.push({
                id: `jobdata-${job.id}`,
                title: job.title,
                company: job.company?.name ?? "Not stated",
                location: job.location?.trim() || (job.has_remote ? "Remote" : "Not stated"),
                remote: Boolean(job.has_remote),
                source: "Job Data API",
                url: job.application_url,
                postedAt: job.published ?? new Date().toISOString(),
                tags: [],
                country: normaliseCountry(job.countries?.[0]?.code) ?? country,
                certifications: detectCertifications(text),
              });
            }
          } catch {
            // One page failing must not empty the board.
          }
          return jobs;
        })(),
      );
    }
  }
  const pages = await Promise.all(requests);
  return pages.flat().filter((job) => isItJob(job.title, job.tags));
}

interface MuseJob {
  id: number;
  name: string;
  company?: { name?: string };
  locations?: { name?: string }[];
  refs?: { landing_page?: string };
  publication_date?: string;
  contents?: string;
  categories?: { name?: string }[];
}

/**
 * The Muse republishes postings from employer career sites, including on-site
 * roles, and needs no key.
 */
async function fetchTheMuse(country: string): Promise<TechJob[]> {
  const pages = await Promise.all(
    Array.from({ length: 6 }, (_, index) => index + 1).map(async (page) => {
      const jobs: TechJob[] = [];
      try {
        const res = await fetch(
          `https://www.themuse.com/api/public/jobs?category=Computer%20and%20IT&page=${page}`,
          {
            signal: AbortSignal.timeout(12000),
            headers: { "User-Agent": "IT PATH study app (job board links)" },
          },
        );
        if (!res.ok) return jobs;
        const payload = (await res.json()) as { results?: MuseJob[] };
        for (const job of payload.results ?? []) {
          const url = job.refs?.landing_page;
          if (!job.name || !url) continue;
          const location = job.locations?.map((l) => l.name).filter(Boolean).join(" · ") || "Not stated";
          jobs.push({
            id: `muse-${job.id}`,
            title: job.name,
            company: job.company?.name ?? "Not stated",
            location,
            remote: /remote|flexible/i.test(location),
            source: "The Muse",
            url,
            postedAt: job.publication_date ?? new Date().toISOString(),
            tags: (job.categories ?? []).map((c) => c.name ?? "").filter(Boolean),
            country: detectJobCountry(location),
            certifications: detectCertifications(`${job.name} ${stripHtml(job.contents ?? "")}`),
          });
        }
      } catch {
        // One page failing must not empty the board.
      }
      return jobs;
    }),
  );
  return pages
    .flat()
    .filter((job) => isItJob(job.title, job.tags) && jobMatchesCountry(job.country, country));
}

/** Jobicy accepts a geography slug, so remote roles can be scoped to a country. */
const JOBICY_GEO: Record<string, string> = {
  US: "usa",
  CA: "canada",
  GB: "uk",
  IE: "ireland",
  DE: "germany",
  FR: "france",
  NL: "netherlands",
  ES: "spain",
  PT: "portugal",
  IT: "italy",
  PL: "poland",
  SE: "sweden",
  CH: "switzerland",
  AT: "austria",
  BE: "belgium",
  AU: "australia",
  NZ: "new-zealand",
  IN: "india",
  SG: "singapore",
  JP: "japan",
  ZA: "south-africa",
  BR: "brazil",
  MX: "mexico",
  AR: "argentina",
  AE: "uae",
};

interface JobicyJob {
  id: number;
  jobTitle: string;
  companyName: string;
  jobGeo?: string;
  url: string;
  pubDate?: string;
  jobDescription?: string;
  jobIndustry?: string[];
}

async function fetchJobicy(country: string): Promise<TechJob[]> {
  const geo = JOBICY_GEO[country];
  if (!geo) return [];
  const jobs: TechJob[] = [];
  for (const industry of ["technical-support", "engineering", "devops-sysadmin"]) {
    try {
      const res = await fetch(
        `https://jobicy.com/api/v2/remote-jobs?count=40&geo=${geo}&industry=${industry}`,
        { signal: AbortSignal.timeout(12000) },
      );
      if (!res.ok) continue;
      const payload = (await res.json()) as { jobs?: JobicyJob[] };
      for (const job of payload.jobs ?? []) {
        const text = `${job.jobTitle} ${stripHtml(job.jobDescription ?? "")}`;
        jobs.push({
          id: `jobicy-${job.id}`,
          title: job.jobTitle,
          company: job.companyName,
          location: job.jobGeo?.replace(/\s+/g, " ").trim() || "Remote",
          remote: true,
          source: "Jobicy",
          url: job.url,
          postedAt: job.pubDate ?? new Date().toISOString(),
          tags: job.jobIndustry ?? [],
          country,
          certifications: detectCertifications(text),
        });
      }
    } catch {
      // One source failing must not empty the board.
    }
  }
  return jobs.filter((job) => isItJob(job.title, job.tags));
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

async function fetchRemotive(country: string): Promise<TechJob[]> {
  const jobs: TechJob[] = [];
  for (const search of ["it support", "help desk", "network", "system administrator", "cyber security"]) {
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
          country: detectJobCountry(location),
          certifications: detectCertifications(text),
        });
      }
    } catch {
      // One source failing must not empty the board.
    }
  }
  return jobs.filter(
    (job) => isItJob(job.title, job.tags) && jobMatchesCountry(job.country, country),
  );
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

async function fetchArbeitnow(country: string): Promise<TechJob[]> {
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
          country: detectJobCountry(job.location),
          certifications: detectCertifications(text),
        });
      }
    }
  } catch {
    // One source failing must not empty the board.
  }
  return jobs.filter(
    (job) => isItJob(job.title, job.tags) && jobMatchesCountry(job.country, country),
  );
}

interface RemoteOkJob {
  id?: string | number;
  position?: string;
  company?: string;
  location?: string;
  url?: string;
  date?: string;
  description?: string;
  tags?: string[];
}

async function fetchRemoteOk(country: string): Promise<TechJob[]> {
  const jobs: TechJob[] = [];
  try {
    const res = await fetch("https://remoteok.com/api", {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "IT PATH study app (job board links)" },
    });
    if (res.ok) {
      const payload = (await res.json()) as RemoteOkJob[];
      for (const job of payload) {
        // The first array entry is legal metadata, not a job.
        if (!job.id || !job.position || !job.url) continue;
        const text = `${job.position} ${stripHtml(job.description ?? "")}`;
        const location = job.location?.trim() || "Remote";
        jobs.push({
          id: `remoteok-${job.id}`,
          title: job.position,
          company: job.company ?? "Not stated",
          location,
          remote: true,
          source: "Remote OK",
          url: job.url,
          postedAt: job.date ?? new Date().toISOString(),
          tags: job.tags ?? [],
          country: detectJobCountry(location),
          certifications: detectCertifications(text),
        });
      }
    }
  } catch {
    // One source failing must not empty the board.
  }
  return jobs.filter(
    (job) => isItJob(job.title, job.tags) && jobMatchesCountry(job.country, country),
  );
}

interface HimalayasJob {
  title: string;
  companyName?: string;
  applicationLink?: string;
  guid?: string;
  pubDate?: number | string;
  description?: string;
  categories?: string[];
  locationRestrictions?: string[];
}

/** Himalayas lists remote roles with the countries each one is open to. */
async function fetchHimalayas(country: string): Promise<TechJob[]> {
  const jobs: TechJob[] = [];
  try {
    const res = await fetch("https://himalayas.app/jobs/api?limit=100", {
      signal: AbortSignal.timeout(12000),
      headers: { "User-Agent": "IT PATH study app (job board links)" },
    });
    if (res.ok) {
      const payload = (await res.json()) as { jobs?: HimalayasJob[] };
      for (const job of payload.jobs ?? []) {
        if (!job.title || !job.applicationLink) continue;
        const text = `${job.title} ${stripHtml(job.description ?? "")}`;
        const restriction = job.locationRestrictions?.join(", ") ?? "";
        const posted =
          typeof job.pubDate === "number"
            ? new Date(job.pubDate * 1000).toISOString()
            : (job.pubDate ?? new Date().toISOString());
        jobs.push({
          id: `himalayas-${job.guid ?? job.applicationLink}`,
          title: job.title,
          company: job.companyName ?? "Not stated",
          location: restriction ? `Remote · ${restriction}` : "Remote",
          remote: true,
          source: "Himalayas",
          url: job.applicationLink,
          postedAt: posted,
          tags: job.categories ?? [],
          country: detectJobCountry(restriction),
          certifications: detectCertifications(text),
        });
      }
    }
  } catch {
    // One source failing must not empty the board.
  }
  return jobs.filter(
    (job) => isItJob(job.title, job.tags) && jobMatchesCountry(job.country, country),
  );
}

const WWR_FEEDS = [
  "remote-devops-sysadmin-jobs",
  "remote-customer-support-jobs",
  "remote-back-end-programming-jobs",
];

/** We Work Remotely publishes each category as an RSS feed. */
async function fetchWeWorkRemotely(country: string): Promise<TechJob[]> {
  const jobs: TechJob[] = [];
  for (const feed of WWR_FEEDS) {
    try {
      const res = await fetch(`https://weworkremotely.com/categories/${feed}.rss`, {
        signal: AbortSignal.timeout(12000),
        headers: { "User-Agent": "IT PATH study app (job board links)" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of xml.split("<item>").slice(1)) {
        const pick = (tag: string) => {
          const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
          if (!match?.[1]) return "";
          return stripHtml(match[1].replace(/<!\[CDATA\[|\]\]>/g, ""));
        };
        const rawTitle = pick("title");
        const link = pick("link");
        if (!rawTitle || !link) continue;
        const [companyPart, ...titleParts] = rawTitle.split(":");
        const title = (titleParts.join(":").trim() || rawTitle).trim();
        const region = pick("region") || "Remote";
        const pubDate = pick("pubDate");
        jobs.push({
          id: `wwr-${link}`,
          title,
          company: titleParts.length > 0 ? (companyPart ?? "").trim() : "Not stated",
          location: region,
          remote: true,
          source: "We Work Remotely",
          url: link,
          postedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          tags: [pick("category")].filter(Boolean),
          country: detectJobCountry(region),
          certifications: detectCertifications(`${title} ${pick("description")}`),
        });
      }
    } catch {
      // One feed failing must not empty the board.
    }
  }
  return jobs.filter(
    (job) => isItJob(job.title, job.tags) && jobMatchesCountry(job.country, country),
  );
}

/**
 * Company career boards. The list is not fixed: source discovery probes a wide
 * catalogue of boards every few hours and this reads whichever ones are live,
 * so new sources join and dead ones drop out on their own.
 */
interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
}

interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  categories?: { location?: string; team?: string; commitment?: string };
  descriptionPlain?: string;
}

interface AshbyJob {
  id: string;
  title: string;
  jobUrl?: string;
  applyUrl?: string;
  location?: string;
  isRemote?: boolean;
  publishedAt?: string;
  department?: string;
}

function boardJobs(board: DiscoveredBoard, payload: unknown): TechJob[] {
  const jobs: TechJob[] = [];
  const company = board.name;
  const source = `${company} careers`;

  if (board.provider === "greenhouse") {
    for (const job of ((payload as { jobs?: GreenhouseJob[] }).jobs ?? [])) {
      if (!job.title || !job.absolute_url) continue;
      const location = job.location?.name?.trim() || "Not stated";
      jobs.push({
        id: `greenhouse-${board.slug}-${job.id}`,
        title: job.title,
        company,
        location,
        remote: /remote/i.test(location),
        source,
        url: job.absolute_url,
        postedAt: job.updated_at ?? new Date().toISOString(),
        tags: [],
        country: detectJobCountry(location),
        certifications: detectCertifications(job.title),
      });
    }
    return jobs;
  }

  if (board.provider === "lever") {
    for (const job of (Array.isArray(payload) ? (payload as LeverJob[]) : [])) {
      if (!job.text || !job.hostedUrl) continue;
      const location = job.categories?.location?.trim() || "Not stated";
      jobs.push({
        id: `lever-${board.slug}-${job.id}`,
        title: job.text,
        company,
        location,
        remote: /remote/i.test(location),
        source,
        url: job.hostedUrl,
        postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
        tags: [job.categories?.team ?? ""].filter(Boolean),
        country: detectJobCountry(location),
        certifications: detectCertifications(`${job.text} ${job.descriptionPlain ?? ""}`),
      });
    }
    return jobs;
  }

  for (const job of ((payload as { jobs?: AshbyJob[] }).jobs ?? [])) {
    const url = job.jobUrl ?? job.applyUrl;
    if (!job.title || !url) continue;
    const location = job.location?.trim() || "Not stated";
    jobs.push({
      id: `ashby-${board.slug}-${job.id}`,
      title: job.title.trim(),
      company,
      location,
      remote: Boolean(job.isRemote) || /remote/i.test(location),
      source,
      url,
      postedAt: job.publishedAt ?? new Date().toISOString(),
      tags: [job.department ?? ""].filter(Boolean),
      country: detectJobCountry(location),
      certifications: detectCertifications(job.title),
    });
  }
  return jobs;
}

async function fetchCompanyBoards(country: string): Promise<TechJob[]> {
  const boards = await getLiveBoards();
  const perBoard = await Promise.all(
    boards.map(async (board) => {
      try {
        const res = await fetch(boardListUrl(board.provider, board.slug), {
          signal: AbortSignal.timeout(12000),
          headers: { "User-Agent": "IT PATH study app (job board links)" },
        });
        if (!res.ok) return [];
        return boardJobs(board, await res.json());
      } catch {
        // One board failing must not empty the rest.
        return [];
      }
    }),
  );
  return perBoard
    .flat()
    .filter((job) => isItJob(job.title, job.tags) && jobMatchesCountry(job.country, country));
}



// ---------------------------------------------------------------- handler

const cache = new Map<string, { at: number; jobs: TechJob[] }>();
const CACHE_MS = 15 * 60 * 1000;

export const getTechJobs = createServerFn({ method: "GET" })
  .inputValidator((input: { country?: string } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<TechJobsResult> => {
    const asked = normaliseCountry(data.country);
    const detectedCode = countryFromRequest();
    const country = asked ?? detectedCode ?? DEFAULT_JOB_COUNTRY;
    const detected = !asked && Boolean(detectedCode);

    const cached = cache.get(country);
    if (cached && Date.now() - cached.at < CACHE_MS) {
      return { country, detected, jobs: cached.jobs };
    }

    const settled = await Promise.all([
      fetchJobDataApi(country),
      fetchJobicy(country),
      fetchRemotive(country),
      fetchArbeitnow(country),
      fetchRemoteOk(country),
      fetchHimalayas(country),
      fetchWeWorkRemotely(country),
      fetchCompanyBoards(country),
    ]);

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
      .slice(0, 600);

    if (jobs.length > 0) cache.set(country, { at: Date.now(), jobs });
    return { country, detected, jobs: jobs.length > 0 ? jobs : (cached?.jobs ?? []) };
  });
