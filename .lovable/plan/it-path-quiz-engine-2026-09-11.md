# IT PATH Quiz Engine

## Goal
Build one reusable quiz experience for the existing eight-topic curriculum without changing the application architecture or visual system. Every attempt remains immutable history, starts only when the learner presses Start, and is scored only after submission.

## What will be built
- Replace the empty quiz screen with one shared engine that supports Multiple Choice, Multiple Response, Scenario, Troubleshooting, Short Answer, and Command Questions.
- Add a substantive static question bank tied to the existing stable topic and certification IDs. At least 40% of the bank will test diagnosis, selection, or applied reasoning rather than simple recall.
- Let learners start a randomized quiz, answer questions, move Next and Previous, and submit only after all required answers are present.
- Randomize question order for each new attempt and choice order only for choice-based questions. Store the generated order so refresh and review remain stable.
- Score answers deterministically using exact selections or normalized acceptable answers. Explanations remain hidden until submission.
- Show a review with score, correct/incorrect totals, per-question explanations, weak topics, mistake categories, and recommended topic review.
- Persist every attempt independently, including answers, generated order, results, timestamps, and retake lineage. Retake always creates a new record and never overwrites earlier attempts.
- Create unresolved mistake records for incorrect answers and scheduled review records for weak topics using the existing centralized state system.

## Data and integration
- Advance the LocalStorage data version and safely migrate older quiz attempts into the expanded attempt shape.
- Expand the typed quiz/question/attempt models and add centralized add/update quiz-attempt actions; static question content remains separate from user activity.
- Add the quiz bank as a focused curriculum data module and re-export it through the existing static-content registry.
- Extend diagnostics to verify quiz retrieval, immutable lifecycle mutation, versioning, and honest zero-state initialization.

## Validation
- Test all six question types and confirm question/choice randomization does not break scoring.
- Test Start → Answer → Next → Previous → Submit → Review → Retake.
- Verify score, correct/incorrect counts, weak topics, mistake categories, recommendations, and explanations.
- Verify refresh persistence during an active quiz and after submission, plus immutable attempt history.
- Check desktop and mobile layouts, console/runtime errors, LocalStorage migration, diagnostics, and the final build signal.
