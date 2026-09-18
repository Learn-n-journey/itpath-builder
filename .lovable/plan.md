# Community rooms, badges, track pages and flashcards

Four additions. Each builds on what the app already records, so nothing shows a number that was not earned.

## 1. Study rooms tied to sections

Today there is one shared chat room. This adds rooms per section.

- Every message gets a room. Existing messages stay in the General room.
- The Community page gains a room list: General plus a room for each section in your certificate, with the sections you are currently working on at the top.
- Each section page gets a "Discuss this section" button that opens that section's room.
- Same rules as now: signed in only, display name, word filter, rate limit, delete your own, report others.
- A room with no messages says so plainly and invites the first question.

## 2. Achievement badges

A new Achievements page collecting what you have actually done:

- The certification readiness meter that already exists, shown at the top.
- Your streak: current run, best run, freezes banked.
- Badges, each earned from recorded work, each with the evidence written underneath: first section mastered, 5 / 10 / 25 sections mastered, first stage exam passed, all stage exams passed, 7 / 30 / 100 day streaks, 100 / 500 / 2000 questions answered, first troubleshooting ticket closed, first teach-back accepted, first lab completed, perfect section quiz, a month with study on 20 days.
- Unearned badges stay visible and greyed with the exact thing that unlocks them. No fake progress, no points.
- Earned badges feed the existing one-time celebration overlay rather than a second popup system.

## 3. Public certification track pages

Nine new crawlable pages, one per certificate, at `/tracks/<certificate>` (for example `/tracks/comptia-a-plus`).

Each page carries: exam code and what the exam covers, the full section list linking to the existing free study guides, what you will be able to do at the end, how the study works here, the free practice test link where one exists, and a sign-up call to action. Full page metadata, canonical URL, social tags, Course structured data and breadcrumbs, and all nine added to the sitemap. Public, outside the app shell, no login.

## 4. Flashcard mode

A new Flashcards page plus a "Flashcards" button on each section.

- Cards are built from material that already exists per section: key terms, the quick reference rows, exam traps, common mix-ups and the self-check questions. Nothing generated, nothing invented.
- Tap or press space to flip, then mark Got it / Not yet.
- Cards follow the same spacing the review system uses, so a card you know comes back later and a card you miss comes back tomorrow. Card results are saved with your other progress and sync to your account.
- Built for a phone first: large tap targets, swipe or button controls, works offline from the cached material.
- The deck shows honest counts: due today, learning, known.

## Technical notes

- Migration: add `room text not null default 'general'` to `community_messages`, index on `(room, created_at desc)`, keep the existing policies and add the column to the realtime payload use. Room ids are `general` or `topic-<id>`, validated client side against the static curriculum.
- `src/lib/badges.ts`: pure derivation from `UserData` + `Intelligence`, mirroring `src/lib/celebrations.ts` so the overlay and the page share one source.
- New routes: `src/routes/achievements.tsx`, `src/routes/tracks.$slug.tsx`, `src/routes/flashcards.tsx`, `src/routes/flashcards.$topicId.tsx`. Sidebar entries: Achievements under You, Flashcards under Practice.
- Flashcard scheduling reuses `src/lib/review-engine.ts` intervals via a new `src/lib/flashcards.ts`; state stored in a new `flashcardReviews` array on `UserData` with an `APP_DATA_VERSION` bump and a safe default for older saves.
- Track pages reuse `src/lib/public-guides.ts` and `src/lib/structured-data.ts`; sitemap picks them up from the existing route scan.
- Checks before finishing: typecheck, `bun run lint:content`, full test run, build, and a browser pass on each new page.
