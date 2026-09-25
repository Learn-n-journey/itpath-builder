import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ExternalLink, Play, Search } from "lucide-react";

import { PageHeader } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchYouTubeVideoPage, type VideoSearchResult } from "@/lib/tech-videos.functions";

export const Route = createFileRoute("/learn/videos")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q.slice(0, 100) : "" }),
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Video Search | IT PATH" }, { name: "description", content: "Explore YouTube videos related to a technology concept." }] }),
  component: LearningVideoSearchPage,
});

function LearningVideoSearchPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const searchPage = useServerFn(searchYouTubeVideoPage);
  const [query, setQuery] = useState(q);
  const [videos, setVideos] = useState<VideoSearchResult[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load(term: string, pageToken = "", append = false) {
    const clean = term.trim();
    if (clean.length < 2) return;
    append ? setMoreLoading(true) : setLoading(true);
    try {
      const result = await searchPage({ data: { query: clean, pageToken } });
      setMessage(result.status === "youtube" ? null : result.message ?? result.status);
      setNextPageToken(result.nextPageToken);
      setVideos((current) => append ? [...current, ...result.videos.filter((video) => !current.some((old) => old.id === video.id))] : result.videos);
    } catch {
      setMessage("Video search request failed.");
      if (!append) setVideos([]);
    } finally {
      setLoading(false);
      setMoreLoading(false);
    }
  }

  useEffect(() => { setQuery(q); void load(q); }, [q]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = query.trim();
    if (clean.length < 2) return;
    void navigate({ search: { q: clean } });
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2"><Link to="/learn"><ArrowLeft className="size-4" />Back to Learn</Link></Button>
      <PageHeader title={q ? `Videos about “${q}”` : "Search videos"} description="Explore supplemental YouTube explanations without changing your My Path progress or mastery." />
      <form onSubmit={submit} className="relative mb-6">
        <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-primary" aria-hidden />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search YouTube learning videos" className="h-12 bg-card pl-10 pr-24 text-base" />
        <Button type="submit" size="sm" className="absolute right-1.5 top-1/2 -translate-y-1/2">Search</Button>
      </form>
      {message ? <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Video search unavailable. <span className="block pt-1 text-xs">Diagnostic: {message}</span></div> : null}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length:6},(_,i)=><div key={i} className="aspect-video animate-pulse rounded-xl bg-muted" />)}</div> : videos.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-video bg-muted">
                  {playing === video.id ? <iframe src={video.embedUrl} title={video.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : (
                    <button type="button" onClick={() => setPlaying(video.id)} className="group relative h-full w-full" aria-label={`Play ${video.title}`}>
                      <img src={video.thumbnail} alt="" className="h-full w-full object-cover" />
                      <span className="absolute inset-0 grid place-items-center bg-background/20"><span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"><Play className="size-6 translate-x-px" fill="currentColor" /></span></span>
                    </button>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="line-clamp-2 font-display font-semibold leading-snug">{video.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{video.channel}</p>
                  {video.summary ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{video.summary}</p> : null}
                  <a href={video.url} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Watch on YouTube <ExternalLink className="size-3" /></a>
                </div>
              </article>
            ))}
          </div>
          {nextPageToken ? <div className="mt-6 flex justify-center"><Button variant="outline" disabled={moreLoading} onClick={() => void load(q, nextPageToken, true)}>{moreLoading ? "Loading…" : `More videos about “${q}”`}</Button></div> : null}
        </>
      ) : !message ? <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">No videos found for that search.</p> : null}
    </>
  );
}
