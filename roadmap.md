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

18. [x] Tech Jobs sidebar page: aggregated real IT job listings, filter/sort by location and certification. Sources: free public job APIs with no key needed (Remotive remote jobs, Arbeitnow). Server-side fetch + cache, link out to original postings. Outside the learning system.
19. [x] Recategorize the "You" sidebar group: move Tech News, Tech Videos, Community into a new "Connect" group; keep personal items in "You"; Tech Jobs goes in Career.

20. [x] Tech Jobs: detect visitor country and aggregate from country-appropriate job sources (add per-country boards, e.g. USAJOBS/Adzuna/Jooble style, plus country filter UI)

21. [ ] Tech Jobs: try to list Indeed, Monster and ZipRecruiter postings (check what each allows)
22. [x] Automated protections: nightly external link crawler, JSON-LD course/guide structured data, content lint script, originality check API, Lighthouse CI
23. [x] Course pack boundary in src/content so the engine can be reused for other subjects
24. [ ] Document how remixing works when payments are enabled

22. [x] Community study rooms per section, achievement badges page, public certification track pages, spaced repetition flashcards.
- [x] 21 Self-correcting quality loop: stable rule and subject ids, rule book (src/lib/quality/rules.ts), independent auditor (audit.ts), `bun run audit`, `bun run gate` (generate, test, audit, correct, retest, approve, monitor, improve) with a run ledger in .quality/.

## Domain-agnostic platform (done)
- `src/domain/*`: subject definition (wording, vocabulary, optional feeds); `active.ts` is the switch.
- `src/content/pack-contract.ts` + `src/content/packs/it-pack.ts`; `course-pack.ts` is the material switch.
- Engine, AI prompts, exports, structured data and navigation read the active subject.
- `bun run domain -- brief.json`: generate -> independent QA audit -> targeted correction -> retest -> approve -> ledger.
- Subject-level rules in the rule book; QA covered by `src/lib/domain/validate.test.ts`.

## Versioned domain packages (done)
- `src/domain/package.ts`: the package contract (manifest, definition, qualifications, sections, lessons, concepts, skills, prerequisites, questions, assessments, sources, rules) with stable `<domain>:<kind>:<slug>` ids.
- `src/domain/registry.ts`: every subject version by `id@version`; `ACTIVE_PACKAGE` is the only live line. `src/domain/active.ts` reads it.
- `src/content/packs/it-package.ts`: the shipped IT subject as a package; `src/domain/package.test.ts` holds it to the package audit.
- `src/lib/domain/package-build.ts`, `package-audit.ts`, `activation.server.ts`, `emit.server.ts`: build, independently audit, write (isolated + versioned) and activate.
- `bun run domain` = generate -> validate -> QA -> correct -> retest -> approve -> activate -> monitor; `bun run domain:activate`, `bun run domain:rollback`. Logged in `.quality/domain-activations.json`.

## Deterministic Autonomy Core
- [x] Observe domain-neutral learner evidence and calculate concept, lesson, assessment and prerequisite health.
- [x] Diagnose weak mastery, retention, repeated failures, misconceptions and prerequisite gaps with versioned thresholds.
- [x] Create stable, versioned improvement candidates without changing live content.
- [x] Require package validation, exact assessment sizes and regression success before approval.
- [x] Monitor protected metrics and choose keep, wait or rollback deterministically.
- [x] Keep append-only autonomy decisions and permanent failure memory that strengthens future prevention thresholds.
- [ ] Prove the unchanged core against IT and Auto Repair, including degradation rollback.
