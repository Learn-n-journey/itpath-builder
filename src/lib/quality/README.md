# The self-correcting loop

Anything written by an AI, a script or a person passes through the same loop
before a learner sees it:

```text
Generate -> Test -> Audit -> Correct -> Retest -> Approve -> Monitor -> Improve
```

| Stage | Who does it | Where it lives |
| --- | --- | --- |
| Generate | the curriculum and quiz engines | `src/data`, `src/lib/quiz-*` |
| Test | the automated suite | `bun run test` |
| Audit | the rule book, applied by an independent auditor | `src/lib/quality/rules.ts`, `audit.ts` |
| Correct | the engines' own repair pass, which swaps only failing places | `src/lib/quiz-selection.ts`, `quiz-finalize.ts` |
| Retest | a second, independent draw and a re-audit | `scripts/quality-gate.ts` |
| Approve | the gate's exit code | `bun run gate` |
| Monitor | a ledger of every run | `.quality/ledger.json` |
| Improve | the rules that fail most often, listed after each run | `bun run gate` output |

## The pieces

**Stable ids.** Every finding names a rule id (`questions.sound`) and a subject
id (`question:q-123`, `quiz:section-quiz-topic-dns-fundamentals#0`). Both are
permanent, so the same problem is recognised as the same problem across runs and
across tools.

**Concept ids.** `conceptIdFor(question)` in `src/data/topic-quizzes.ts` gives
every question one stable idea, anchored to its own section. Mastery,
deduplication, adaptive selection and review all read the same id.

**The rule book.** `rules.ts` states every standard once, in plain words, with a
severity. `blocking` means the material may not ship. `warning` means it should
be fixed but nothing stops.

**The auditor.** `audit.ts` reads the material as it stands and returns
findings. It changes nothing and decides nothing, which is what lets it act as a
check on whatever generated the material.

**The gate.** `bun run gate` runs the whole loop and exits non zero when the
material is not fit to publish. `bun run audit` runs the audit alone, optionally
for named sections.

## Adding a rule

1. Add it to `qualityRules` with a new permanent id and a plain statement.
2. Apply it in `runContentAudit` with `note(findings, "<id>", "<subject>", detail)`.
3. Run `bun run audit`. Fix what it finds, or lower the severity to `warning`
   and record why in the rule's statement.

Never change a published rule id. Retire it and add a new one instead, so the
ledger stays comparable.

## For an AI making changes here

- Generate into `src/data` or the engines, never into the auditor.
- The auditor and the generator stay separate files; do not let one import the
  other's private helpers.
- A change is finished when `bun run gate` exits zero, not when the code
  compiles.
