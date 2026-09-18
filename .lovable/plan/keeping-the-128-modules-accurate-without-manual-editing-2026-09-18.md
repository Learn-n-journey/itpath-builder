# Keeping the 128 modules accurate without manual editing

Four layers: one fixed voice for every AI answer, a second AI pass that checks the first, hard number checks that run without AI, and a report button so learners flag anything that slips through.

## 1. One locked voice and shape for every AI answer

Today each AI feature writes its own instructions, so tone drifts between the tutor, marking, scenarios and explanations.

- New shared rules module holding the IT PATH voice contract: warm teacher, plain sentences, no long dashes, no markdown symbols, say when something is uncertain, never invent commands, flags, paths or prices.
- Every AI call passes through the shared runner, so the contract is attached in that one place instead of in each feature.
- Feature prompts keep only what is specific to them (teach, mark, quiz, scenario), and lose their duplicated tone lines.
- A final text pass strips anything that still breaks the shape (long dashes, stray markdown) before the learner sees it.

## 2. Critic pass on the work that does not have one yet

The tutor and marking already get a silent second review. Extend the same pattern:

- Scenario and incident generation, and the explanation text produced anywhere else, get a review pass for invented commands, impossible step orders and unsafe advice.
- The reviewer stays on the cheap model, never blocks, and silently keeps the original answer when the check cannot run, exactly like today.
- The review also receives the number-check results from layer 3 so it can correct a bad figure instead of just flagging it.

## 3. Deterministic number checks (no AI involved)

A new validation module that reads text and verifies the maths itself:

- Storage conversions and binary vs decimal prefixes (KB/KiB, MB/MiB, GB/GiB, TB), including "a 1 TB drive shows as ... " style claims.
- Subnet statements: CIDR to mask, usable host counts, network and broadcast addresses.
- Powers of two, bit/byte conversions, data rate vs throughput (Mbps vs MB/s).
- Well known port numbers and protocol pairings against a fixed reference table.
- Percentages and totals that do not add up.

Where it runs:
- On AI output before display, feeding any failure into the critic pass.
- As a repeatable sweep over all 128 sections' lessons, key terms, examples and every quiz question, wired into the existing test suite so a wrong figure fails the build rather than reaching a learner.

## 4. Report a problem button

- A small quiet control on lesson sections, individual quiz questions and AI answers: "Report a problem", with a short reason list (wrong information, confusing wording, broken question, out of date) and an optional note.
- Reports save to a new backend table with the section, question or answer reference, keyed to the signed-in learner, with access rules so a learner can only see and remove their own.
- Reports are listed on the existing internal AI usage page, grouped by section, so the pattern of edge cases is visible in one place.
- The learner gets a short thank-you, nothing more; no interruption to their study.

## Technical notes

- Shared contract: `src/lib/ai/persona.ts`, applied inside `runAi` in `src/lib/ai/run.server.ts`.
- Critic: extend `src/lib/ai-self-check.server.ts` (`reviewTutorAnswer`, `reviewGrade`) with a scenario/explanation reviewer, called from `src/lib/terminal/ai-scenario.functions.ts` and other AI features.
- Number checks: `src/lib/technical-validation.ts`, plus a sweep test beside the existing engine tests covering `src/data/static-content.ts` and the generated question bank.
- Reports: migration for `content_reports` (id, user_id, kind, ref_id, reason, note, created_at) with RLS and grants; server function for insert/list; UI control in the learning components and the tutor answer view; listing added to `src/routes/ai-usage.tsx`.
- No change to curriculum content, navigation or theme.
