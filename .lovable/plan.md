# Improve multiple-choice answer quality

Replace weak distractors across the question banks so wrong answers are believable mistakes a learner might actually make, rather than unrelated or silly options.

## Changes

- Audit authored multiple-choice and multiple-response questions across lessons, weekly quizzes, practice banks, and certification tests.
- Rewrite distractors to stay in the same technical domain, match the correct answer's style and specificity, and reflect common misconceptions or nearby troubleshooting steps.
- Improve generated terminology questions so distractors come from the same topic or certification first, falling back to the wider curriculum only when necessary.
- Keep every correct answer, explanation, score, and question identifier unchanged unless wording must be clarified.

## Technical detail

- Update the shared distractor selection in `src/data/question-bank.ts` to rank related terms by topic and certification.
- Replace obvious authored distractors in the core and additional practice banks.
- Add a deterministic content-quality check that catches duplicate choices, missing correct answers, and known joke or unrelated filler patterns.

## Verification

- Run the question-bank integrity checks and TypeScript checks.
- Confirm representative beginner, intermediate, and advanced quizzes still load with one valid answer and plausible alternatives.
- Confirm the app build remains clean.
