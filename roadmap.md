# IT PATH Review Engine

## Engagement pass (requested 2026-09-15)
- [ ] Daily Challenge (/daily-challenge): one deterministic mixed 5-question set per day, scored by the shared quiz runner, fed to mistakes/reviews, compared to past attempts, day streak of completed challenges
- [ ] Streak freeze: freeze tokens protect a missed day (StreakPanel actions), streak engine honors frozen days
- [ ] Streak shown on the sign-in screen and pricing page
- [ ] Milestone celebration overlay: first Reliable topic, cert progress thresholds, streak milestones; once per milestone
- [ ] Journey map: visual route through the curriculum phases with mastered phases lit
- [ ] GAYL check-in after a 3+ day gap (non-urgent, in the thread and bubble)
- [ ] Public profile page with real numbers and shareable link (needs scoping decision)
- [ ] Study groups / accountability partner (needs scoping)
- [ ] Email recap: bulk recap emails are not possible with Lovable app emails (transactional only); in-app check-in covers the return loop
- [ ] Journey map: list each of the 59 topics once (build from static topic list only)
- [ ] Remove month and year/duration references from the journey map wording
- [ ] Visual polish for the engagement additions (journey map, daily challenge, milestone overlay)

## About page polish (Sep 2026)

## About page polish (Sep 2026)
- [x] Rewrite About page copy in a natural, professional voice
- [x] Add an email action for reporting errors

## Adaptive certification path
- [x] Remove learner-facing difficulty controls and labels
- [x] Use certification target and experience to recommend a starting topic
- [x] Prioritize the selected certification across learning and activity pages
- [x] Verify settings changes and focused pages in desktop and mobile preview

- [x] Fixed interval ladder: 1, 3, 7, 14, 30, 60, 90 days
- [x] Review page sections: Due Today, Overdue, Upcoming, Weak Concepts, Recently Failed, Mastered
- [x] Passing advances the interval; failing shortens it and records a lapse
- [x] Every graded review attempt stored immutably; opening a review never counts as a pass
- [x] Manual reschedule without grading
- [x] Tested due, overdue, upcoming, pass, fail, reschedule in the browser plus diagnostics

- Troubleshooting engine: 9 incidents (hardware, Windows, networking, DNS, DHCP, Linux, security, cloud, authentication), diagnostic actions with distinct findings, diagnose/reason/fix/verify/document, 6-dimension scoring, mistakes fed to central system. Verified in browser.

- Career Mode: 5 tickets (Help Desk, IT Technician, Network Technician, Junior Sysadmin, Junior Security Analyst) with investigate/diagnose/resolve/verify/document, 6-dimension scoring (technical accuracy, troubleshooting, reasoning, communication, documentation, efficiency), immutable attempts, retakes, mistakes fed to central system. Pass requires correct diagnosis plus every required resolution and verification step plus usable written work. Verified one full ticket per track in the browser.

## Daily study engine
- [x] 30/60/90/120 minute plans generated from real user data
- [x] Priority: review, weak topics, new material, practice, lab, assignment, quiz
- [x] Start / pause / resume / complete / skip / finish with tracked time
- [x] Plans and tracked sessions persisted (schema v12)
- [x] Weekly system: 4 curriculum weeks, weekly quizzes + assessments via shared quiz runner, evidence-based week completion

## Content depth audit (Sep 2026)
- [x] Labs expanded to 117 (walkthrough + fault-diagnosis drill per topic, generated from module content)
- [x] Career tickets expanded to 59 (one per topic, correct diagnosis/resolutions/verifications, hints on wrong options)
- [x] Quiz Me now draws from 93 quizzes (per-topic sets + per-certification mixed reviews) over 714 questions
- [x] Verified every question has an answer and explanation, and every choice question's answer is among its choices
- [x] Troubleshooting incidents expanded to 63 (one generated per topic + 9 authored)
- [x] Weak Areas tab: quiz built from open mistakes and weak topics; correct answers clear the mistake

## Usability pass (Sep 2026)
- [x] "How it works" page: study loop, what each section is for, six dimensions, scoring vocabulary
- [x] Dashboard "Start here" panel for new users, moved above the zero stats
- [x] Nav items carry one-line descriptions (tooltips + guide)
- [x] Removed raw attempt IDs from the mistake log
- [x] Career Skills topic recommendations use typed routes
- [x] Troubleshoot: searchable queue, certification-focused ordering, scrollable list

## Intelligence pass (Sep 2026)
- [x] Exam readiness score per certification (weighted factors, blockers, projected ready date) on dashboard + certification page
- [x] "Do this next" smarter next action, ranked from real records
- [x] Study Insights page: 28-day study time, momentum, quiz trend, weak/strong topics, mistake causes, evidence counts

## Accounts & cloud sync (Sep 2026)
- [x] Lovable Cloud enabled; email/password + Google sign-in
- [x] /auth sign in / sign up page, /reset-password page
- [x] user_state table (per-user RLS) storing the whole progress snapshot
- [x] AuthProvider + cloud sync in AppStateProvider: pull on sign-in (larger record wins), debounced push on change
- [x] Sidebar account panel with backup status and sign out
- [x] Deeper written lessons, AI-checked free responses, and progress/portfolio export

## AI grading
- Written answers in Practice, Recall, Teach Back and Real-World Scenario are marked by AI (google/gemini-2.5-flash) with a full tutoring response; meaning-based local matching is the offline fallback.

## Lesson depth pass (Sep 2026)
- Added a depth layer to every one of the 54 lessons: key ideas, a worked walkthrough, a reference table, misconceptions, exam traps and self-check questions (src/data/deep-lessons/depth-*.ts).
- Rendered by src/components/learning/lesson-depth-reading.tsx under the main reading; study-time estimates now count the depth words.

## Payments & launch (Sep 2026)
- [x] Paddle payments, $99 lifetime Pro product, pricing + checkout success pages
- [x] Pro gate on AI Tutor, AI grading, Labs, Troubleshoot
- [x] Free access list (beta/creator) with owner-only management panel in Settings
- [x] Terms of Use, Privacy Notice, Refund Policy pages linked from the app footer

## Pricing plans (Sep 2026)
- [x] Pro plans: $8/mo (itpath_pro_monthly), $70/yr (itpath_pro_yearly), $149 lifetime (itpath_pro_lifetime_price, was $99)
- [x] Pricing page shows Free + three paid tiers; yearly flagged Best value
- [x] Webhook already handles recurring subs + one-time lifetime; access until period end on cancel
- [x] AI Tutor history: chats auto-save to account (tutor_threads), New chat archives + starts fresh, 30-day auto-expiry, Clear history button

## Intelligence pass (Sep 2026)
- Quick search palette (Ctrl/Cmd+K) over pages, topics, certifications and labs.
- Streak panel on the dashboard (current/longest run, daily goal, 7-day grid) from src/lib/streak-engine.ts.
- Optional daily study reminder (Settings → Daily reminder, in-app toast + browser notification).
- Exam Simulator route /exam: timed, randomised, 75% pass mark, Pro-gated.
- Adaptive ordering engine src/lib/adaptive-engine.ts surfaced on My Path.

## Command-line simulator completion (Sep 2026)
- [x] Rewrite About page in first person
- [x] Add realistic guided and challenge scenarios for CMD, PowerShell, and Linux
- [x] Add persistent resumable virtual machines and terminal transcripts
- [x] Score command choice, diagnostic process, and final machine state
- [x] Feed results and misconceptions into the learner model
- [x] Add adaptive task selection, hints, explanations, and navigation
- [x] Verify commands, persistence, scoring, desktop, and mobile behavior

## Command-line environment switch (Sep 2026)
- [x] Add a Mac/Linux and Windows environment switch
- [x] Keep CMD and PowerShell selectable inside Windows
- [x] Verify environment and shell switching on desktop and mobile

## Full-scope progress audit (Sep 2026)
- [x] Define one full-scope evidence model for topics, certifications, skills, and career readiness
- [x] Replace attempted-only progress percentages with correct/completed opportunities divided by all available opportunities
- [x] Distinguish performance averages from progress/readiness percentages in the interface
- [x] Add regression checks for one-perfect-attempt and untouched-content cases
- [x] Verify progress pages and dashboards on desktop and mobile

## Lesson quality pass (requested 2026-09-14)
- [x] Audit lesson/question alignment across all phases (only gap found: 5 Mobile Devices topics had questions but no deep lesson)
- [x] Write full deep lessons + depth layer for the 5 Mobile Devices topics (hardware, connectivity, configuration, security/MDM, troubleshooting)
- [x] Confirmed lessons already link in-app resources via the MediaPanel on each topic page
- [ ] Optional: add per-topic (rather than per-certification) video resources — today every topic links the whole Messer course

## Open
- [ ] Practice stage: more than one question per topic (currently getPracticeActivity returns a single activity)

## SEO content pages: free practice tests (requested 2026-09-15)
- [x] Research keywords and SERP with Semrush (A+, Network+, Security+ practice tests)
- [x] Public route /practice-tests/$certId for A+, Network+ and Security+ with 18 questions each
- [x] Answers and explanations present in the served HTML, Reveal answer toggle client-side
- [x] Canonical, og:url, per-page title/description, BreadcrumbList JSON-LD
- [x] Three URLs added to sitemap.xml; footer link to the free practice tests
- [x] Unknown certification id returns a noindex not-found page
- [x] Verified: typecheck clean, build OK, pages render signed-out, sitemap includes URLs
