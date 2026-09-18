# Course pack: how to reuse this app for another subject

This app is two things bolted together:

1. **The engine** (reusable, subject free) — lessons UI, mastery gates, spaced
   review, recall practice, GAYL, Second Brain, AI tutor with the voice contract
   and critic pass, quizzes and exams, labs, tickets, incidents, study plan,
   journey map, progress and insights, community chat, news/videos/jobs feeds,
   payments, theme, PWA/mobile shell, link crawler, content linter, originality
   check, Lighthouse setup.
2. **The course pack** — the subject matter. That is all of `src/data`, wired
   together in `src/content/course-pack.ts`.

To teach a different subject (auto repair, HVAC, welding, nursing, anything with
levels, exams and hands-on work) you replace the pack and leave the engine alone.

## Steps for a new subject

1. **Remix this project.** That copies the engine, the database setup and the
   design. Work in the copy so IT PATH keeps running.
2. **Write the qualification tracks** in `src/data/certification-content.ts`.
   For auto repair these would be ASE areas: Brakes (A5), Electrical (A6),
   Engine Performance (A8), and so on, each with its published objectives.
3. **Write the sections.** Use the `TopicSeed` shape in
   `src/data/curriculum/builder.ts` and register them in
   `src/data/curriculum/index.ts`. One seed produces the section, its lesson,
   its module, its recall questions, practice and scenarios.
4. **Write the deep lessons** in `src/data/deep-lessons/` for the sections that
   need full teaching text.
5. **Set the order** in `src/data/journey-phases.ts` and the prerequisites in
   `src/data/prerequisite-graph.ts`. This drives unlocking and the journey map.
6. **Point the question generators at the new subject.** `topic-quizzes.ts`,
   `stage-exams.ts`, `mastery-checks.ts` and `question-bank.ts` generate items
   from the lesson content, so mostly they follow automatically; the wording
   templates inside them are the part to reread.
7. **Replace the hands-on content**: `lab-content.ts`, `ticket-content.ts`,
   `incident-content.ts`, `assignment-content.ts`. For identification labs,
   `hardware-explorer.ts` holds the numbered parts, so vehicle diagrams go here.
8. **Replace the outside links**: `messer-topic-videos.ts` (training videos) and
   `topic-reading.ts` (documentation and standards). The nightly crawler checks
   whatever you put there.
9. **Update the words** in `coursePack.subject` in `src/content/course-pack.ts`.
10. **Retune the feeds** if you keep them: search terms in
    `src/lib/tech-jobs.functions.ts`, sources in `tech-news.functions.ts` and
    `tech-videos.functions.ts`.

## Checks before you publish a new pack

```
bun run lint:content     # numbers, unanswerable questions, copied lessons
bun run test             # engine tests plus the pack completeness test
bun run lighthouse       # accessibility and speed
```

`src/content/course-pack.test.ts` is the acceptance test for a pack: every
section needs a lesson, a quiz that can be sat, valid prerequisites and its own
outside links. If a new subject passes it, the engine will run it.

## What you should not need to touch

`src/lib` (the engine), `src/components`, `src/routes`, the database migrations,
the auth and payment setup, and the theme. If a new subject forces a change in
there, that is a sign something subject specific leaked out of the pack and
belongs back in `src/content`.
