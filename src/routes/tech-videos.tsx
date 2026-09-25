import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ExternalLink, Play, RefreshCw, Search } from "lucide-react";

import { PageHeader } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import {
  CHANNEL_DIRECTORY,
  getTechVideos,
  getVideoPage,
  VIDEO_CATEGORIES,
  type ChannelInfo,
  type TechVideo,
  type VideoCategory,
  searchYouTubeVideoPage,
  type VideoSearchResult,
} from "@/lib/tech-videos.functions";

export const Route = createFileRoute("/tech-videos")({
  validateSearch: (search: Record<string, unknown>) => ({ q: typeof search.q === "string" ? search.q.slice(0, 100) : "" }),
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Tech Videos | IT PATH" },
      {
        name: "description",
        content:
          "A scrolling feed of current technology videos on AI, cybersecurity, hardware, networking, Linux, Windows, cloud, programming, IT careers and troubleshooting, played in each platform's own player.",
      },
      { property: "og:title", content: "Tech Videos | IT PATH" },
      {
        property: "og:description",
        content: "Watch the latest technology videos from trusted creators, with a link to every original.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TechVideosPage,
});

function whenLabel(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  const days = Math.round(minutes / (60 * 24));
  if (days < 30) return `${days} d ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function VideoCard({ video, playing, onPlay }: { video: TechVideo; playing: boolean; onPlay: () => void }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card/70 transition hover:border-primary/40">
      <div className="relative aspect-video w-full bg-muted">
        {playing ? (
          <iframe
            src={video.embedUrl}
            title={video.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={onPlay}
            className="group relative block h-full w-full"
            aria-label={`Play ${video.title} on ${video.platform}`}
          >
            {video.thumbnail ? (
              <img
                src={video.thumbnail}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                {video.channel}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-background/20 transition group-hover:bg-background/35">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition group-hover:scale-105">
                <Play className="size-6 translate-x-[1px]" fill="currentColor" />
              </span>
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">{video.category}</span>
          <span className="text-muted-foreground">{video.channel}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{whenLabel(video.publishedAt)}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{video.platform}</span>
        </div>
        <h2 className="font-display text-base leading-snug text-foreground">{video.title}</h2>
        {video.summary ? <p className="line-clamp-2 text-sm text-muted-foreground">{video.summary}</p> : null}
        <div className="flex flex-wrap gap-4 pt-1 text-xs font-medium">
          <a
            href={video.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Watch on {video.platform}
            <ExternalLink className="size-3" />
          </a>
          <a
            href={video.channelUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            {video.channel}
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </article>
  );
}

function ChannelCard({ channel }: { channel: ChannelInfo }) {
  // YouTube's own player shows the channel's latest-upload thumbnail natively,
  // which is the only reliable image source while listing feeds are blocked.
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card/70 transition hover:border-primary/40">
      <div className="relative aspect-video w-full bg-muted">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/videoseries?list=${channel.uploadsPlaylistId}&rel=0&playsinline=1`}
          title={`${channel.name} latest uploads`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">{channel.category}</span>
          <span className="text-muted-foreground">YouTube</span>
        </div>
        <h2 className="font-display text-base leading-snug text-foreground">{channel.name}</h2>
        <a
          href={channel.channelUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary hover:underline"
        >
          Open the channel on YouTube
          <ExternalLink className="size-3" />
        </a>
      </div>
    </article>
  );
}

function TechVideosPage() {
  const { q } = Route.useSearch();
  const fetchVideos = useServerFn(getTechVideos);
  const fetchPage = useServerFn(getVideoPage);
  const searchVideos = useServerFn(searchYouTubeVideoPage);
  const [searchResults, setSearchResults] = useState<VideoSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchPlaying, setSearchPlaying] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!q.trim()) { setSearchResults([]); setSearchMessage(null); return; }
    setSearchLoading(true);
    void searchVideos({ data: { query: q.trim(), pageToken: "" } })
      .then((result) => {
        if (cancelled) return;
        setSearchResults(result.videos);
        setSearchMessage(result.status === "youtube" ? null : result.message ?? result.status);
      })
      .catch(() => { if (!cancelled) { setSearchResults([]); setSearchMessage("Video search request failed."); } })
      .finally(() => { if (!cancelled) setSearchLoading(false); });
    return () => { cancelled = true; };
  }, [q, searchVideos]);
  const [active, setActive] = useState<VideoCategory | "All">("All");
  const [playing, setPlaying] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["tech-videos"],
    queryFn: () => fetchVideos(),
    staleTime: 15 * 60 * 1000,
  });

  const feed = useInfiniteQuery({
    queryKey: ["tech-videos-feed"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchPage({ data: { page: pageParam as number } }),
    getNextPageParam: (last) => last.nextPage,
    staleTime: 15 * 60 * 1000,
  });

  const feedVideos = useMemo(() => {
    // New uploads shift the paging window, so the same video can arrive twice.
    const seen = new Set<string>();
    return (feed.data?.pages.flatMap((page) => page.videos) ?? []).filter((video) => {
      if (seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    });
  }, [feed.data]);
  const shownFeed = useMemo(
    () => (active === "All" ? feedVideos : feedVideos.filter((video) => video.category === active)),
    [feedVideos, active],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, shownFeed.length]);


  const videos = useMemo(() => data ?? [], [data]);
  const usingChannels = !isLoading && videos.length === 0;
  const available = useMemo(() => {
    const present = new Set<VideoCategory>([
      ...(usingChannels ? CHANNEL_DIRECTORY.map((channel) => channel.category) : videos.map((video) => video.category)),
      ...feedVideos.map((video) => video.category),
    ]);
    return VIDEO_CATEGORIES.filter((category) => present.has(category));
  }, [videos, usingChannels, feedVideos]);
  const shownChannels = useMemo(
    () => (active === "All" ? CHANNEL_DIRECTORY : CHANNEL_DIRECTORY.filter((channel) => channel.category === active)),
    [active],
  );
  const shown = useMemo(
    () => (active === "All" ? videos : videos.filter((video) => video.category === active)),
    [videos, active],
  );

  const chip = (label: string, selected: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={
        selected
          ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          : "rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
      }
    >
      {label}
    </button>
  );

  if (q.trim()) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2"><a href="/learn"><ArrowLeft className="size-4" />Back to Learn</a></Button>
        <PageHeader title={`Videos about “${q.trim()}”`} description="YouTube results for your Learn search. These videos are supplemental and do not change mastery or progress." />
        {searchLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="aspect-video animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : searchResults.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {searchResults.map((video) => (
              <article key={video.id} className="overflow-hidden rounded-2xl border border-border bg-card/70">
                <div className="relative aspect-video bg-muted">
                  {searchPlaying === video.id ? <iframe src={video.embedUrl} title={video.title} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : (
                    <button type="button" onClick={() => setSearchPlaying(video.id)} className="group relative h-full w-full" aria-label={`Play ${video.title}`}>
                      {video.thumbnail ? <img src={video.thumbnail} alt="" className="h-full w-full object-cover" /> : null}
                      <span className="absolute inset-0 grid place-items-center bg-background/20"><span className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground"><Play className="size-6" fill="currentColor" /></span></span>
                    </button>
                  )}
                </div>
                <div className="p-4"><h2 className="line-clamp-2 font-display font-semibold">{video.title}</h2><p className="mt-1 text-xs text-muted-foreground">{video.channel} · YouTube</p><a href={video.url} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Watch on YouTube <ExternalLink className="size-3" /></a></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground"><Search className="mb-2 size-5" />No video results are available for “{q.trim()}”.{searchMessage ? <span className="mt-2 block text-xs">Diagnostic: {searchMessage}</span> : null}</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tech Videos"
        description="The latest technology videos from trusted creators, played in each platform's own player. Nothing here is scored or tracked."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        }
      />

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
        {chip("All", active === "All", () => setActive("All"))}
        {available.map((category) => chip(category, active === category, () => setActive(category)))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl border border-border bg-card/50" />
          ))}
        </div>
      ) : usingChannels ? (
        <div className="space-y-4">
          <p className="rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
            The live listing is unavailable right now, so here are the channels themselves. Each card plays that
            creator's newest uploads.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shownChannels.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              playing={playing === video.id}
              onPlay={() => setPlaying(video.id)}
            />
          ))}
        </div>
      )}

      <section className="space-y-4 pt-2">
        <h2 className="font-display text-lg text-foreground">More technology videos</h2>
        <p className="text-sm text-muted-foreground">
          Independent creators from across the open video services. Keep scrolling for more.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shownFeed.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              playing={playing === video.id}
              onPlay={() => setPlaying(video.id)}
            />
          ))}
          {feed.isFetching && shownFeed.length === 0
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-2xl border border-border bg-card/50" />
              ))
            : null}
        </div>
        <div ref={sentinel} className="h-10" />
        {isFetchingNextPage ? (
          <p className="text-center text-sm text-muted-foreground">Loading more videos…</p>
        ) : !hasNextPage && shownFeed.length > 0 ? (
          <p className="text-center text-sm text-muted-foreground">That's everything for now.</p>
        ) : null}
      </section>
    </div>
  );
}
