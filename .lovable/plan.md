# Spreadsheet-written lessons (IT PATH + AUTO PATH)

You already author quiz questions in numbered spreadsheets. This adds the same thing for the
lesson text itself: you write a lesson in a spreadsheet, push it, and it replaces the
AI-written lesson for that topic completely.

## How the folders work

Two new folders alongside your existing ones, in the same root:

```text
itpath             1.xlsx, 2.xlsx …   quiz questions (already working)
itpath lessons     1.xlsx, 2.xlsx …   lesson text (new)
autopath           1.xlsx, 2.xlsx …   quiz questions
autopath lessons   1.xlsx, 2.xlsx …   lesson text (new)
```

Numbering is the same list as the quizzes: 1 is the first topic of that course, in curriculum
order. The file number decides which topic the lesson lands on, so `1.xlsx` in "itpath lessons"
and `1.xlsx` in "itpath" always refer to the same topic.

## The lesson workbook format

One workbook per topic, with these tabs. Every tab has a header row; you fill the rows below it.
Leave a tab empty and that part of the lesson is simply not shown.

**Tab `Lesson`** (one row of values under the headers)

| Title | Reading minutes | Intro | Where you meet it |
|---|---|---|---|

**Tab `Sections`** — the main teaching body, in order

| Heading | Paragraph | Bullets |
|---|---|---|

One row per paragraph. Repeat the same heading on consecutive rows to add more paragraphs to
that section. `Bullets` is optional; separate bullets with a line break or `|`.

**Tab `Key ideas`**

| Idea |
|---|

**Tab `Walkthrough`** — one worked scenario, start to finish

| Title | Scenario | Step label | Step detail | Outcome |
|---|---|---|---|---|

Title, Scenario and Outcome only need filling on the first row; each row after that is one step.

**Tab `Reference`**

| Reference heading | Term | Detail |
|---|---|---|

**Tab `Misconceptions`**

| Claim | Correction |
|---|---|

**Tab `Exam traps`**

| Trap |
|---|

**Tab `Check yourself`**

| Question | Answer |
|---|---|

**Tab `Sources`** — the links you paste

| Label | URL | Kind |
|---|---|---|

`Kind` is `reading` or `video` (blank means reading). These render as the small-print
"Lesson sources" line already shown under every lesson.

**Tab `Plain words`** (optional beginner layer)

| Plain intro | Term | In plain words |
|---|---|---|

I will generate a ready-to-fill template workbook for you to download, so you never have to
type the headers yourself.

## What happens when you push

- A topic with a lesson spreadsheet shows **only your lesson**. The AI-written lesson for that
  topic is retired everywhere it is used — the Learn page, flashcards, study-time estimates,
  the command palette, and the misconception-based quiz material.
- Every lesson runs through the same rule-based checks the AI lessons must pass (no
  placeholders, no filler, no repeated headings, no empty self-checks, real paragraphs).
  A lesson that fails is rejected and the previous one stays live, with the reasons recorded
  so you can fix the rows.
- Delete the spreadsheet and the topic returns to the built-in lesson.

## Sync buttons

The Settings page "Spreadsheet questions" panel becomes **Spreadsheet content**, with three
buttons:

- **Sync IT PATH** — pulls "itpath" and "itpath lessons"
- **Sync AUTO PATH** — pulls "autopath" and "autopath lessons"
- **Sync everything** — both courses, same as the nightly run

Each shows what came in: topics touched, questions approved/rejected, lessons accepted/rejected
with reasons. The nightly 04:30 UTC job keeps running and now covers lessons too.

## Technical notes

- New table `owner_lessons` (domain, topic_id, source_file, lesson jsonb, sources jsonb,
  status, reject_reasons, synced_at), service-role writes, owner-only read, same shape as
  `owner_questions`.
- `src/lib/owner-lessons-shared.ts`: workbook tabs → `DeepLesson` + `DomainSource[]`, then
  `lessonQualityIssues()` decides accept/reject. AI never approves anything.
- `src/lib/sheet-sync.server.ts` gains a lesson pass per folder and an optional domain filter;
  `runSheetSync({ domain })`.
- `src/lib/owner-lesson-store.ts` mirrors `owner-question-store.ts` (live load, version bump,
  build-time snapshot fallback so a topic never silently loses its lesson).
- `getDeepLesson()` in `src/data/deep-lessons.ts` and the auto adapter in
  `src/content/packs/from-package.ts` both check the owner store first, so the override applies
  to every surface that reads lessons.
- Template workbook generated into `/mnt/documents` with the exact tabs and headers.
