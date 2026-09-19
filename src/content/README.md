# Running this app on another subject

The app is two things bolted together:

1. **The engine** (reusable, subject free) — lessons UI, mastery gates, spaced
   review, recall practice, adaptive selection and concept mastery, GAYL,
   Second Brain, AI tutor with the voice contract and critic pass, quizzes and
   exams, labs, tickets, incidents, study plan, journey map, progress,
   insights and analytics, community, payments, theme, mobile shell, link
   crawler, content linter, originality check, quality gate.
2. **The subject** — two switches and the material behind them:
   - `src/domain/active.ts` decides the **wording**: what the field is called,
     what a qualification is, what a section is, what a lab is, what the app is
     called, where the material comes from, what a new learner starts on.
     Everything the engine prints or tells the AI reads from here.
   - `src/content/course-pack.ts` decides the **material**: a pack under
     `src/content/packs` that satisfies `src/content/pack-contract.ts`.

Changing subject means changing those two lines and supplying a pack. No engine
file spells out a subject by name.

## Option A: let the pipeline write it

```
bun run domain -- brief.json
```

`brief.json`:

```json
{
  "id": "auto-repair",
  "field": "auto repair",
  "awardingBody": "ASE",
  "qualifications": ["Brakes (A5)", "Electrical (A6)", "Engine Performance (A8)"],
  "sectionsPerQualification": 10,
  "notes": "Imperial measurements. Always work to the service manual figure."
}
```

The pipeline runs:

```text
generate -> QA audit -> correct -> retest -> approve -> monitor
```

- **Generate** writes the definition, the qualifications with their published
  objectives, the sections with lessons, recall, practice and scenarios, and
  the outside sources.
- **QA audit** is independent. It never asks the generator how it did: it reads
  the draft as data and applies the rule book in `src/lib/quality/rules.ts`,
  including the deterministic number checks and the question soundness checks.
- **Correct** rewrites only the sections that failed, and is given only the
  findings against those sections.
- **Retest** re-audits after each round, up to three rounds.
- **Approve** is the exit code. Nothing is called good because it was
  generated.
- **Monitor** writes the run to `.quality/domain-ledger.json`, so a rule that
  keeps failing on this subject is visible run to run.

Output lands in `src/content/packs/<id>/` as ordinary TypeScript.

## Option B: write it by hand

1. Write the domain definition next to `src/domain/it.ts` and point
   `src/domain/active.ts` at it.
2. Write the qualification tracks and objectives in
   `src/data/certification-content.ts`.
3. Write the sections using the `TopicSeed` shape in
   `src/data/curriculum/builder.ts` and register them in
   `src/data/curriculum/index.ts`. One seed produces the section, its lesson,
   its module, recall, practice and scenario.
4. Write the deep lessons in `src/data/deep-lessons/`.
5. Set the order in `src/data/journey-phases.ts` and prerequisites in
   `src/data/prerequisite-graph.ts`.
6. Replace the hands-on content: `lab-content.ts`, `ticket-content.ts`,
   `incident-content.ts`, `assignment-content.ts`, and `hardware-explorer.ts`
   for identification work.
7. Replace outside links: `messer-topic-videos.ts` and `topic-reading.ts`. The
   nightly crawler checks whatever is there.
8. Build the pack in `src/content/packs/<id>.ts` and point
   `src/content/course-pack.ts` at it.
9. Turn off the feeds you do not want in the definition's `feeds`.

Question generation, mastery, review and assessment all derive from the seeds,
so they follow automatically.

## Before a new subject ships

```
bun run gate            # generate, test, audit, correct, retest, approve
bun run lint:content    # numbers, unanswerable questions, copied lessons
bun run lighthouse      # accessibility and speed
```

`src/content/course-pack.test.ts` is the acceptance test: every section teaches
something, is quizzable, belongs to a qualification that exists, unlocks in a
sane order, and has its own outside sources. It also checks that the wording
and the material describe the same subject. If a subject passes it, the engine
will run it.

## What you should not need to touch

`src/lib` (the engine), `src/components`, `src/routes`, the migrations, auth,
payments and the theme. If a subject forces a change in there, something
subject specific leaked out of the pack and belongs back here.
