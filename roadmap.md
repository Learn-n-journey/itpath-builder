# IT PATH Review Engine

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
- [ ] Next: deeper written lessons, AI-checked free responses, progress/portfolio export

## AI grading
- Written answers in Practice, Recall, Teach Back and Real-World Scenario are marked by AI (google/gemini-2.5-flash) with a full tutoring response; meaning-based local matching is the offline fallback.

## Lesson depth pass (Sep 2026)
- Added a depth layer to every one of the 54 lessons: key ideas, a worked walkthrough, a reference table, misconceptions, exam traps and self-check questions (src/data/deep-lessons/depth-*.ts).
- Rendered by src/components/learning/lesson-depth-reading.tsx under the main reading; study-time estimates now count the depth words.
