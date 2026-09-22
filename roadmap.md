# Roadmap

- [x] Neutral main entrance for choosing IT PATH or AUTO PATH; neither course dashboard is the home page.
- [x] Main entrance account controls: universal sign-in for visitors, session-aware dashboard access, and owner-only Exclusive settings.
- [x] Separate first-launch onboarding state and AUTO PATH wording for the automotive course.

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
- [x] Prove the unchanged core against IT and Auto Repair, including degradation rollback.

## Open
- [x] Premium tactile feel applied app-wide (pressable physics, smooth scroll)

24. [ ] Full ASE auto repair course (A1-A8 + G1, ~10 sections per area) as a selectable subject. IT stays the active default; auto is chosen in Settings, never overriding IT.
25. [ ] Per-subject theme: auto repair gets a Service Bay Blue light/dark palette; IT keeps its teal obsidian look.
26. [ ] Auto repair course is owner-only: subject switcher and auto subject visible solely to the owner account.
27. [ ] Auto practice tools (owner/auto course only): virtual OBD-II scan tool (read/clear codes, live data, freeze frame) and virtual engine simulator, in the style of the existing virtual terminal and virtual motherboard.

- [x] Ensure every topic (both subjects) has attached reading resources and video material
- [x] Add automotive channels to Tech Videos and automotive outlets to Tech News

- [x] Auto course theme: owner-specified palettes — dark navy #0F172A / slate #1E293B / cyan #38BDF8; light platinum #F8FAFC / white / royal blue #0284C7 (src/styles.css)
- [x] QA finding: auto Journey Map stages now named after ASE certifications
- [x] QA finding: subject choice mirrored to a cookie so refresh no longer serves IT first

- [x] Question-quality gate: reject generic/title-restating questions, recognition-only vocabulary checks, absolute or obviously false distractors, and near-duplicates within a section; regenerate instead of accepting. Applies to every subject.
- [x] Regenerate all question banks under the new quality checks once the checks are in place.
- [x] Drop every question that fails the quality checks instead of keeping it in the course.

- [x] Enforce answer-format alignment: every correct and wrong choice must answer the exact kind of question asked; remove all violations from active course banks.
- [x] Broaden deterministic quality enforcement for questions and lessons; reject weak, incoherent, unsupported, repetitive, or unteachable material before publication.
- [x] Remove confusing quiz wording and reject prompts that frame questions around a section or section title.
- [x] Enforce comprehensive lesson and assessment rejection for factual, contextual, alignment, prerequisite, source, uniqueness, completeness, and instructional-value defects.
- [x] Make every quality finding blocking and require rewriting/regeneration when a quiz pool is too thin; use AI only as a writer, never its own approver.

- [x] Remove answer-revealing definition questions and widen question pools (repetition)
- [ ] Align item quality rules with real-world exam item-writing standards (NBME-style guidelines)
- [x] Apply real-world lesson-writing standards to lessons, in original wording only (no copied text)
- [x] Confirm no lesson or question text matches other written work before publishing
- [x] Finish widening thin question pools (every section now 26+ questions, median 36)
- [x] Auto News and Auto Videos endless-scrolling feeds for the auto repair course (auto-only nav items, automotive outlets + technician communities, automotive creator channels)

- [x] Replace the AUTO PATH logo everywhere with the owner's uploaded version (About page asset + dashboard logo when the auto course is active)
- [x] Car-themed match-3 puzzle game (Garage Match): automotive part tiles, repair-job levels, vehicle restoration, special combos (battery surge, engine blast), knowledge challenges, car/garage unlocks and customization, unlimited procedurally generated levels
- [x] Add small-print verified sources to every IT PATH and AUTO PATH lesson, with automated coverage protection.
- [x] Retire blended-subsystem AI questions ("voltages prove heat needs are met" family): deterministic guard in question-quality, generator prompts updated, bank pruned
- [x] Answer: can we use an AI trained in quiz question creation?
- [x] Filter blended-subsystem questions at runtime before they reach the user (usableQuestions gate)
- [x] Nightly scheduled content audit: /api/public/content-audit runs the full rule book over both courses nightly (04:45 UTC), findings recorded in content_audit_runs
- [ ] Answer: can the audit results read from/write to a spreadsheet?
- [ ] User-authored questions via spreadsheet (WAITING for owner go-ahead — do not build until asked): owner will have SEVERAL Excel sheets, one per topic; a MASTER EXCEL INDEX SHEET lists each sheet's link and the topic it feeds. Nightly pull reads the index, imports each sheet's full-format rows (question, 4 choices, correct answer, explanation) into that topic's practice (separate from built-in pools), every row passes the deterministic quality gate first, rejected rows get pass/reject reasons written back to the sheet. Workspace Excel App connector (owner account, not per-user).
- [x] Answer: ways to store owner-authored questions the app can pull from (Excel via connector / in-app editor / file upload / pasted text)
- [x] Virtual Engine rebuilt: animated SVG cutaway (piston, rod, crank, valves, spark, flow arrows, exhaust puffs), 720° stroke timeline, per-stroke watch-fors, ungraded self-check; Virus Run removed from auto entirely; auto pack brand renamed to AUTO PATH
- [x] Spreadsheet import test: OneDrive itpath/1.xlsx -> topic-computer-hardware-basics. scripts/import-owner-questions.ts reads the numbered sheets via the Excel connector, gates every row, writes src/data/owner-questions.ts; topicPool uses owner questions in place of the generated pool for that topic. 22 of 30 rows accepted.

## Automatic spreadsheet question sync (done)
- [x] Topic 1 practice pool uses owner spreadsheet questions only.
- [x] Purge every old question for spreadsheet-covered topics from all surfaces (topic quizzes, cert quizzes, daily challenge, weak areas, missed questions, exams).
- [x] Stable numbering: IT PATH topics 1..N and AUTO PATH topics 1..M in curriculum order; spreadsheet N feeds topic N.
- [x] owner_questions table (Lovable Cloud) so new spreadsheets go live without a rebuild.
- [x] /api/public/sheet-sync route: reads OneDrive "itpath" and "autopath" folders, maps numbered files to topics, runs the quality gate, stores approved/rejected rows.
- [x] Nightly schedule (04:30 UTC, pg_cron) so uploads populate quizzes automatically; link-check 04:15, content audit 04:45.
- [x] App reads live owner questions from the database, with the build-time file as offline fallback.
- [x] Verified live: topics 1 and 2 serve only spreadsheet questions; 44 approved, 16 rejected stored with reasons; tests pass, build OK.
- [x] "Sync now" button on Settings (owner-only): runs the same sync immediately without waiting for the nightly pull or opening Lovable.

## AUTO PATH lesson depth (in progress)
- [ ] Expand every AUTO PATH topic into full "how it works" + "how to diagnose and repair it" reading (deep lesson layer, original wording, deterministic quality gate).
- [ ] Find outside material specific to each topic, verify each link responds, and attach it as that lesson's small-print sources.
- [ ] Answer/plan: owner-authored LESSONS from spreadsheets (same numbered-folder model as questions) — waiting on owner go-ahead.

- [ ] Spreadsheet-written lessons: "itpath lessons" / "autopath lessons" folders, numbered per topic, quality-gated, override AI lessons; per-course sync buttons
- [x] Spreadsheet-written lessons: itpath lessons / autopath lessons folders, quality-gated, override built-in lessons; per-course sync buttons
- [x] Shorten all AUTO PATH branding text and metadata to the course name only; keep all features unchanged.

- Owner lesson spreadsheets always publish; automatic checks are advisory notes only (owner verifies manually). Done.
- Lesson spreadsheets carry a Practice tab; owner practice rows replace a topic\'s built-in practice. Done.
- Lesson workbooks also feed Recall, Teach back, Real world scenario, Worked examples and Practice tabs; each replaces the built-in version for that topic. Done.

- Recall workbooks: "itpath recall" and "autopath recall" folders, one tabbed workbook per topic (Recall, Teach back, Application, Troubleshooting), same numbering; owner rows replace the built-in/AI versions for that topic. Done.
- Lesson page: merged "Common Problems" + "How It Fails" into one "What goes wrong" section; study stage names renamed (Read, Read again take notes, Test yourself, Practice, Explain it back). Done.

- [x] Spreadsheet sync now runs on the server (queue + self-arming minute worker) so it finishes with the app closed
- [x] Excel sync retries temporary 429/503/504 failures and reads large worksheet ranges in bounded pages
- [x] Spreadsheet sync downloads each changed workbook once and parses every sheet locally, bypassing Excel's slow workbook-opening service

- [x] Owner-only refresh button on every topic that syncs only that topic from its spreadsheets and confirms completion

## Current
- [ ] Reorganize topic lessons into Read It → See It → Try It → Prove It → Keep Handy without changing learning logic or content.

- [x] Simplify the topic overview quick links to Read It, See It, Try It, and Prove It only.
