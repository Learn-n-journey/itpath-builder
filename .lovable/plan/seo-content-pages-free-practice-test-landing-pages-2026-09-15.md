# SEO content pages: free practice-test landing pages

## Goal

Give search engines real, public, indexable study pages that target high-volume, low-difficulty CompTIA keywords, using the app's existing question bank as the content. Each page also funnels visitors into the free tier.

## Evidence (Semrush, US database)

- "comptia a+ practice test" — 5,400/mo, difficulty 28 (low). SERP is beatable: examcompass, certblaster, quizlet decks, one Reddit thread.
- "comptia a+ practice exam" — 3,600/mo; "comptia a+ study guide" — 2,900/mo.
- "comptia security+ exam practice" — 2,400/mo; "comptia security practice test" — 2,900/mo.
- The site currently has no rankings and no backlinks, and no public content pages: every curriculum route is `sitemap: false`, dynamic topic routes are excluded from sitemap.xml, and no public page carries a canonical or og:url.

## Scope: three pages, one per top certification

| Route | Page | Primary keyword |
|---|---|---|
| /practice-tests/comptia-a-plus | Free CompTIA A+ Practice Test | comptia a+ practice test |
| /practice-tests/comptia-network-plus | Free CompTIA Network+ Practice Test | network+ practice test |
| /practice-tests/comptia-security-plus | Free CompTIA Security+ Practice Test | security+ practice test |

Network+ and Security+ follow the same template, so the marginal cost is small and the three pages interlink.

## Page design (identical template, data-driven)

A new public route `src/routes/practice-tests.$certId.tsx` that reads the certification's real questions from the existing question bank and static content. No auth, fully server-rendered.

1. H1 + intro copy (2 to 3 short paragraphs): what the exam covers, which exam codes, how IT PATH scores practice honestly, and that everything below is free. Written for a beginner, no em dashes, IT PATH voice.
2. Practice section: 15 to 20 real questions for that certification. Each renders question, four choices, and a Reveal answer toggle; the answer and its explanation are present in the initial HTML so crawlers see the full content. Draw from the existing question bank plus practice-extra seeds for that certification's topics.
3. Conversion block: "Want every question, scored, with honest progress tracking?" CTA to create a free account (/auth) and to the lesson library (/learn). States plainly that accounts are free.
4. Cross-links: the other two practice-test pages, plus related certification page and 2 to 3 relevant topic pages.
5. Head metadata per head-meta rules: title under 60 chars, description under 160, canonical and og:url at https://it-path.net/practice-tests/<certId>, og:type, twitter:card, and BreadcrumbList JSON-LD. Unknown certId returns notFound.
6. `staticData: { sitemap: true }` and extend `src/routes/sitemap[.]xml.ts` to append the three dynamic URLs (deterministic list of the three cert ids, since the static sitemap builder skips parameterised routes).

## Wiring

- Footer (and the landing page's certification section) link to the three practice-test pages so crawlers find them from every page.
- No changes to learning engines, auth, or paywalls. Existing app behaviour is untouched.

## Out of scope for this pass

- Making /topics/$topicId public and indexable (a separate decision: those pages expose user-scoped UI).
- Canonical/og:url cleanup on every existing public page (done as a small follow-up once the new pages land).
- Backlink outreach, Google Search Console setup, and the landing page trust pass.

## Verification

- tsgo clean, build clean, sitemap.xml contains the three new URLs.
- Playwright check: each page renders questions without sign-in, Reveal answer works, canonical present.
