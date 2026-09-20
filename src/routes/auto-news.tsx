import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, RefreshCw } from "lucide-react";

import { PageHeader, Panel } from "@/components/page-kit";
import { Button } from "@/components/ui/button";
import {
  AUTO_NEWS_CATEGORIES,
  getAutoNews,
  getAutoNewsPage,
  type AutoNewsArticle,
  type AutoNewsCategory,
} from "@/lib/auto-news.functions";

export const Route = createFileRoute("/auto-news")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Auto News | ASE Master Mechanic Simulator" },
      {
        name: "description",
        content:
          "A live feed of automotive news across repair and maintenance, diagnostics, shop business, new cars, electric vehicles, recalls, tools and car culture.",
      },
      { property: "og:title", content: "Auto News | ASE Master Mechanic Simulator" },
      {
        property: "og:description",
        content: "Current automotive headlines for working and future technicians, with a link to every original article.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AutoNewsPage,
});

function whenLabel(iso: string): string {
  const then = new Date(iso);
  const minutes = Math.round((Date.now() - then.getTime()) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return then.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function ArticleCard({ article }: { article: AutoNewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/70 transition hover:border-primary/50 hover:bg-card"
    >
      {article.image ? (
        <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
          <img
            src={article.image}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            onError={(event) => {
              event.currentTarget.parentElement?.remove();
            }}
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium text-primary">{article.category}</span>
          <span className="text-muted-foreground">{article.source}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{whenLabel(article.publishedAt)}</span>
        </div>
        <h2 className="font-display text-base leading-snug text-foreground group-hover:text-primary">{article.title}</h2>
        {article.summary ? (
          <p className="line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-medium text-primary">
          Read at {article.source}
          <ExternalLink className="size-3" />
        </span>
      </div>
    </a>
  );
}

function AutoNewsPage() {
  const fetchNews = useServerFn(getAutoNews);
  const fetchPage = useServerFn(getAutoNewsPage);
  const [active, setActive] = useState<AutoNewsCategory | "All">("All");
  const sentinel = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ["auto-news"],
    queryFn: () => fetchNews(),
    staleTime: 10 * 60 * 1000,
  });

  const feed = useInfiniteQuery({
    queryKey: ["auto-news-feed"],
    initialPageParam: "",
    queryFn: ({ pageParam }) => fetchPage({ data: { cursor: pageParam } }),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 10 * 60 * 1000,
  });

  const feedArticles = useMemo(() => {
    // New stories shift the paging window, so the same item can arrive twice.
    const seen = new Set<string>();
    return (feed.data?.pages.flatMap((page) => page.articles) ?? []).filter((article) => {
      if (seen.has(article.id)) return false;
      seen.add(article.id);
      return true;
    });
  }, [feed.data]);
  const shownFeed = useMemo(
    () => (active === "All" ? feedArticles : feedArticles.filter((article) => article.category === active)),
    [feedArticles, active],
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

  const articles = useMemo(() => data ?? [], [data]);
  const available = useMemo(() => {
    const present = new Set<AutoNewsCategory>([
      ...articles.map((article) => article.category),
      ...feedArticles.map((article) => article.category),
    ]);
    return AUTO_NEWS_CATEGORIES.filter((category) => present.has(category));
  }, [articles, feedArticles]);
  const shown = useMemo(
    () => (active === "All" ? articles : articles.filter((article) => article.category === active)),
    [articles, active],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auto News"
        description="Current automotive headlines for working and future technicians. Read anything you like, nothing here is tracked or scored."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActive("All")}
          className={
            active === "All"
              ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              : "rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          }
        >
          All
        </button>
        {available.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            className={
              active === category
                ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                : "rounded-full border border-border bg-card/70 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {category}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-2xl border border-border bg-card/50" />
          ))}
        </div>
      ) : (isError || articles.length === 0) && feedArticles.length === 0 ? (
        <Panel title="Nothing to show right now">
          <p className="text-sm text-muted-foreground">
            The news sources could not be reached. Try refreshing in a moment.
          </p>
          <Button className="mt-3" variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </Panel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Headlines and summaries belong to their publishers, and every card links to the original.
          </p>
        </>
      )}

      <section className="space-y-4 pt-2">
        <h2 className="font-display text-lg text-foreground">From the shop floor</h2>
        <p className="text-sm text-muted-foreground">
          Discussions and stories shared by working technicians and enthusiasts. Keep scrolling for more.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shownFeed.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
          {feed.isFetching && shownFeed.length === 0
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-48 animate-pulse rounded-2xl border border-border bg-card/50" />
              ))
            : null}
        </div>
        <div ref={sentinel} className="h-10" />
        {isFetchingNextPage ? (
          <p className="text-center text-sm text-muted-foreground">Loading more stories…</p>
        ) : !hasNextPage && shownFeed.length > 0 ? (
          <p className="text-center text-sm text-muted-foreground">That's everything for now.</p>
        ) : null}
      </section>
    </div>
  );
}
