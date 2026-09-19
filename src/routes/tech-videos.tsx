import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Play, RefreshCw } from "lucide-react";

import { PageHeader } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import {
  CHANNEL_DIRECTORY,
  getTechVideos,
  VIDEO_CATEGORIES,
  type ChannelInfo,
  type TechVideo,
  type VideoCategory,
} from "@/lib/tech-videos.functions";

export const Route = createFileRoute("/tech-videos")({
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
            src={`https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0&playsinline=1`}
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
            <img
              src={video.thumbnail}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
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

function TechVideosPage() {
  const fetchVideos = useServerFn(getTechVideos);
  const [active, setActive] = useState<VideoCategory | "All">("All");
  const [playing, setPlaying] = useState<string | null>(null);

  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ["tech-videos"],
    queryFn: () => fetchVideos(),
    staleTime: 15 * 60 * 1000,
  });

  const videos = useMemo(() => data ?? [], [data]);
  const available = useMemo(() => {
    const present = new Set(videos.map((video) => video.category));
    return VIDEO_CATEGORIES.filter((category) => present.has(category));
  }, [videos]);
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
      ) : isError || videos.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted-foreground">
          The video feed could not be reached just now. Try Refresh in a moment.
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
    </div>
  );
}
