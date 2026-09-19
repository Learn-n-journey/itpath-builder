# Make IT PATH subject-independent

Today the learning machinery is already separate from the material, but the
subject still leaks out in three ways: the words on screen ("certification",
"IT and cybersecurity", "IT PATH") are typed into engine files, the AI is told
it teaches IT, and there is no single switch that says which subject is loaded.

This work closes those three gaps and adds the pipeline that turns a new
subject description into a finished, checked course.

## 1. One domain definition

A new folder holds the definition of whichever subject is loaded: the field
name, the product name, what a qualification is called, what a section is
called, what a lab is called, where material comes from, and the default
starting qualification.

Everything that currently spells out IT reads from that definition instead:

- Study record exports, portfolio exports and backup files
- Readiness wording and exam wording
- Search/social data on public pages
- The AI voice contract, tutor prompts, reviewer prompts and note indexing
- The default qualification for a brand-new learner

Nothing changes on screen for IT PATH, because the IT definition supplies the
same words it uses now.

## 2. The course pack becomes swappable

`src/content/course-pack.ts` gains the domain definition and stops being the
only pack: packs live side by side and one active pack is selected. A new
subject is a folder with its own definition plus its material, and selecting it
is a one line change.

The acceptance test runs against whichever pack is active, so a new subject has
to pass the same bar: every section teaches something, is quizzable, unlocks in
a sane order, and carries its own outside sources.

## 3. Domain authoring pipeline

One command takes a subject brief and runs the full loop, building on the
quality gate that already exists:

```text
brief -> generate -> QA audit -> tests -> correct -> retest -> approve
```

- **Generate** writes the draft domain: qualifications, objectives, concepts,
  skills, section seeds, lessons, assessments and reference sources, into a new
  pack folder.
- **QA audit** is a separate independent pass that judges the draft against the
  written rule book (stable rule ids already exist), plus the number checker,
  the answer plausibility checker and the paper integrity checks. It does not
  trust the generator.
- **Correct** feeds every finding, keyed by its stable rule id and subject id,
  back for a targeted rewrite of only the failing item.
- **Retest** repeats audit and tests until clean or until the attempt limit is
  reached; every run is written to the existing ledger so repeat failures stand
  out.
- **Approve** only marks a pack usable when audit, tests, content lint and the
  pack acceptance test all pass.

A short report at the end lists what was generated, what failed, what was
corrected and what still blocks approval.

## Preserved as engine capability

Mastery gates, adaptive selection, concept mastery, spaced review, recall,
assessments and papers, validation, diagnostics, analytics, GAYL, tutor,
Second Brain, labs, tickets, study plan, journey map, community, payments and
theme all stay exactly as they are and are reused by any subject.

## Technical notes

- New `src/domain/`: `types.ts` (DomainDefinition), `it.ts` (the current
  subject), `active.ts` (the selected domain, re-exported as `domain`).
- Engine files replace hardcoded strings with `domain.*` reads:
  `record-engine.ts`, `portfolio-engine.ts`, `structured-data.ts`,
  `certification-engine.ts`, `ai/persona.ts`, `tutor-prompts.ts`,
  `tutor.functions.ts`, `ai-self-check.server.ts`, `knowledge.functions.ts`,
  `entitlement.server.ts`, `app-data/defaults.ts`.
- `src/content/course-pack.ts` gains `domain` and an active-pack indirection;
  `course-pack.test.ts` asserts against the active pack generically.
- New `scripts/domain-pipeline.ts` (`bun run domain`) orchestrating generate,
  audit, correct, retest, approve, writing to the quality ledger.
- New `src/lib/domain/generate.server.ts` for the AI generation and correction
  passes, using the existing AI runner, voice contract and critic pass.
- Job, news and video feeds stay IT-specific and are marked optional in a pack,
  so another subject can switch them off rather than inherit IT sources.
