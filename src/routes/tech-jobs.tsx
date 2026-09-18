import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Award, Briefcase, ExternalLink, Globe, MapPin, RefreshCw, Search } from "lucide-react";

import { EmptyState, PageHeader } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JOB_COUNTRIES, countryName } from "@/lib/job-countries";
import {
  DEFAULT_JOB_COUNTRY,
  getTechJobs,
  JOB_CERTIFICATIONS,
  type TechJob,
} from "@/lib/tech-jobs.functions";

export const Route = createFileRoute("/tech-jobs")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Tech Jobs | IT PATH" },
      {
        name: "description",
        content:
          "Live IT job listings from public job boards, filtered by location and the certifications employers ask for.",
      },
      { property: "og:title", content: "Tech Jobs | IT PATH" },
      {
        property: "og:description",
        content: "Browse real IT roles and see which certifications each posting mentions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TechJobsPage,
});

function whenLabel(iso: string): string {
  const then = new Date(iso);
  const hours = Math.round((Date.now() - then.getTime()) / 3600000);
  if (hours < 1) return "Just posted";
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function JobCard({ job }: { job: TechJob }) {
  return (
    <article className="panel motion-surface flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold leading-snug">{job.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
          {job.source}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden />
          {job.location}
        </span>
        <span>{whenLabel(job.postedAt)}</span>
      </div>
      {job.certifications.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Award className="size-3.5 text-emphasis" aria-hidden />
          {job.certifications.map((cert) => (
            <span
              key={cert}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              {cert}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-auto pt-1">
        <Button asChild size="sm" variant="outline">
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            View posting on {job.source}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Button>
      </div>
    </article>
  );
}

function TechJobsPage() {
  const fetchJobs = useServerFn(getTechJobs);
  const [country, setCountry] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["tech-jobs", country ?? "auto"],
    queryFn: () => fetchJobs({ data: country ? { country } : {} }),
    staleTime: 10 * 60 * 1000,
  });

  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [cert, setCert] = useState<string>("all");

  const jobs = data?.jobs ?? [];
  const activeCountry = country ?? data?.country ?? DEFAULT_JOB_COUNTRY;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    return jobs.filter((job) => {
      if (cert !== "all" && !job.certifications.includes(cert)) return false;
      if (loc === "remote") {
        if (!job.remote) return false;
      } else if (loc && !job.location.toLowerCase().includes(loc)) {
        return false;
      }
      if (q && !`${job.title} ${job.company} ${job.tags.join(" ")}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [jobs, query, location, cert]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Tech Jobs"
        description="Live IT roles from public job boards in your country. Filter by city or remote work and the certificate you are studying for. Every card links to the original posting."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} aria-hidden />
            Refresh
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Globe className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">Country</span>
          <select
            value={activeCountry}
            onChange={(event) => setCountry(event.target.value)}
            className="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
            aria-label="Country to gather jobs from"
          >
            {JOB_COUNTRIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        {data?.detected && !country ? (
          <span className="text-xs text-muted-foreground">
            Set from where you are browsing. Change it any time.
          </span>
        ) : null}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search role, company or skill"
            className="pl-9"
            aria-label="Search jobs"
          />
        </label>
        <label className="relative block">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location, or type remote"
            className="pl-9"
            aria-label="Filter by location"
          />
        </label>
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter by certification">
        {["all", ...JOB_CERTIFICATIONS].map((option) => {
          const count =
            option === "all"
              ? jobs.length
              : jobs.filter((job) => job.certifications.includes(option)).length;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setCert(option)}
              aria-pressed={cert === option}
              disabled={option !== "all" && count === 0}
              title={
                option !== "all" && count === 0
                  ? "No current listings mention this certificate"
                  : undefined
              }
              className={
                cert === option
                  ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground"
              }
            >
              {option === "all" ? "All certificates" : option}
              {option !== "all" && count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading job listings…</p>
      ) : isError || jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No listings right now"
          body="The job boards did not answer. Try Refresh in a moment."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing matches those filters"
          body="Try a wider location, or clear the certificate filter to see every role."
        />
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            {filtered.length} role{filtered.length === 1 ? "" : "s"} · updated{" "}
            {new Date(dataUpdatedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Listings come from Job Data API, Jobicy, Remotive, Arbeitnow and Remote OK, gathered for the country you pick. IT PATH does not host or alter
        postings; applying always happens on the original site.
      </p>
    </div>
  );
}
