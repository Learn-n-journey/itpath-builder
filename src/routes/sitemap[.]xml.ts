import { createFileRoute } from "@tanstack/react-router";
import { getRouterInstance } from "@tanstack/react-start";
import { sitemapStaticPaths, sitemapXML, type SitemapEntry } from "@/lib/sitemap";
import { guidePath, guideSearchReady, guideTopics } from "@/lib/public-guides";
import { publishedTracks, trackSlug } from "@/lib/tracks";

const BASE_URL = "https://it-path.net";

export const Route = createFileRoute("/sitemap.xml")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async () => {
        const router = await getRouterInstance();
        const entries: SitemapEntry[] = sitemapStaticPaths(router).map((path) => ({ path }));
        // Parameterised public content pages the static builder cannot list.
        const practiceTestPaths = [
          "comptia-a-plus",
          "comptia-network-plus",
          "comptia-security-plus",
        ].map((slug) => `/practice-tests/cert-${slug}`);
        for (const path of practiceTestPaths) {
          if (!entries.some((entry) => entry.path === path)) entries.push({ path });
        }
        // Public certification track pages, one per certificate.
        for (const cert of publishedTracks()) {
          const path = `/tracks/${trackSlug(cert.id)}`;
          if (!entries.some((entry) => entry.path === path)) entries.push({ path });
        }
        // Public study guide pages, one per curriculum section.
        for (const topic of guideTopics().filter((candidate) => guideSearchReady(candidate.id))) {
          const path = guidePath(topic.id);
          if (!entries.some((entry) => entry.path === path)) entries.push({ path });
        }
        if (entries.length === 0) {
          return new Response(
            'No pages are included in this sitemap. Check route decisions and ancestor exclusions. Setting "exclude-subtree" on the root excludes the entire site.',
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }
        return new Response(sitemapXML(BASE_URL, entries), {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
