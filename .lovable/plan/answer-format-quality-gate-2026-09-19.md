# Answer-format quality gate

## What will change
- Add a deterministic check that rejects choices whose response form does not match the question (action, cause, explanation, location, measurement, or identification).
- Apply the same check to generated questions, package review, section quizzes, and stage exams.
- Correct the authored template behind the screenshots and remove any remaining failing questions rather than displaying them.
- Add permanent regression tests for mixed-format distractors and valid matched choices.

## Verification
- Run the complete question audit and existing tests.
- Confirm the active IT course has no answer-format findings and still meets assessment sizes.
- Check the affected quiz in the mobile preview.

## Technical details
The check will use deterministic prompt/choice language patterns and parallel grammatical-shape comparison. AI may rewrite candidates, but only deterministic validation can accept them. IT remains the default; Auto Repair stays separately selectable and owner-only.
