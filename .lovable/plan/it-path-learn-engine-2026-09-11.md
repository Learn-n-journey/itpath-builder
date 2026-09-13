# IT PATH Learn Engine

## Goal
Turn the existing Learn area into a complete, reusable learning workflow for the eight current topics without changing the application architecture, navigation, or visual system.

## Build
- Expand each existing lesson record with substantive topic-specific sections for: What It Is, Why It Matters, How It Works, Where You See It, Key Terms, Examples, Common Problems, How It Fails, Troubleshooting, Practical Knowledge, Exam Coverage, and Interview Questions.
- Add typed curriculum records for recall questions, practice activities, and realistic scenarios. Every item will link to a stable topic ID and contain topic-specific prompts, evaluation guidance, and feedback.
- Extend the versioned user-data model and existing centralized mutation layer for recall responses/results, practice responses, teach-back drafts, scenario responses, and six progress dimensions: understanding, recall, application, practical ability, troubleshooting, and retention.
- Preserve honest progress: opening or reading a lesson will not create completion or mastery. Progress changes only from evaluated recall/practice/scenario work or saved reflective work, and mastery will not be assigned automatically.
- Replace the current Learn list with working search, clear-search, no-results handling, and exact topic selection through typed topic links.
- Use one reusable topic-learning renderer for all eight topics, with stage controls for Learn, Recall, Practice, Teach Back, and Real-World Scenario.
- Add topic-scoped notes and bookmark controls using the existing persistence system. Teach-back responses will support save, edit, and review states.

## Technical details
- Keep static curriculum in `src/data/static-content.ts` and user activity in the existing versioned LocalStorage state.
- Advance the data version and migrate missing fields safely through the current sanitizer.
- Reuse the current provider and `userMutations`; do not add a second store.
- Evaluate structured answers deterministically from curriculum-defined accepted concepts/choices, record attempts, and optionally create linked mistake records for incorrect recall answers.
- Keep existing topic URLs working and make the learning experience available from those exact topic links.

## Verification
- Test search, clear, no results, and result selection.
- For each of the eight topics, verify open, lesson reading sections, recall evaluation, practice, teach-back save/edit/review, scenario response, note, bookmark, progress display, and refresh persistence.
- Check desktop and mobile layouts, application errors, and the final build signal.
