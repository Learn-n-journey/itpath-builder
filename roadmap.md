# Roadmap

Confirmed by user ("Confirm" = all eight functionality improvements):

- [x] 1. Resume card on the dashboard (one tap back into last activity)
- [x] 2. Quick actions on topic rows (quiz / lesson / lab inline)
- [x] 3. Sticky proof-progress ring while reading a lesson
- [x] 4. Journey map filters (all / to do / passed / locked)
- [x] 5. Search results that deep-link (lesson parts, labs)
- [x] 6. Quiz answer review walkthrough mode (one question at a time)
- [x] 7. "Today" strip on the dashboard (due reviews, delayed check, next topic, missed questions)
- [x] 8. Long-press / right-click menu on topic rows (open, quiz, bookmark, remind to review)

Done when: typecheck + build clean, features verified in browser.

- [x] 9. NEW REQUEST: "Play as the virus" arcade game, linked from the sidebar. Tiny digital organism moving through a block-based computer world; each stage is a different system; collect resources, avoid antivirus, find vulnerable paths; later stages add stronger security. Simple arcade gameplay, strong IT identity.
- [x] 10. Game accumulates infinite levels, each harder than the last (endless difficulty ramp).
- [x] 11. After the game: confirm the app is production ready as an educational app (system-wide check).
- [x] 12. Community chat: one room, signed in only, chosen display name, reporting plus language filter.

13. [ ] Full curriculum sweep: close CompTIA objective gaps for Network+, Security+, Linux+, Server+, Cloud+, CySA+, PenTest+, SecurityX; real objective maps.
14. [ ] Tech News sidebar page: modern scrolling feed (AI, security, hardware, networking, Windows, Linux, cloud, programming, mobile, careers, releases, outages) with image, category, headline, summary, date, source, link. Kept entirely outside the learning system.

15. Done: all 128 topics have curated Professor Messer videos, each URL opened and checked.
16. Done: all 128 topics have topic-specific reading from verified primary sources (src/data/topic-reading.ts).
17. Done: Tech Videos sidebar page (src/lib/tech-videos.functions.ts, src/routes/tech-videos.tsx) - official YouTube channel feeds, server-side fetch and 15 min cache, youtube-nocookie embeds, category filters, source links. No downloads, no re-hosting, no learning state.

18. [ ] Tech Jobs sidebar page: aggregated real IT job listings, filter/sort by location and certification. Sources: free public job APIs with no key needed (Remotive remote jobs, Arbeitnow). Server-side fetch + cache, link out to original postings. Outside the learning system.
19. [ ] Recategorize the "You" sidebar group: move Tech News, Tech Videos, Community into a new "Connect" group; keep personal items in "You"; Tech Jobs goes in Career.
