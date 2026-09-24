# Move optional captions behind help icons

## Goal
Reduce persistent explanatory text across learner-facing pages while keeping instructions, status, feedback, warnings, and data visible.

## Changes
- Update shared page headers so optional descriptions appear behind the existing accessible question-mark help control beside the title.
- Update shared titled sections so their optional descriptions use the same help control instead of occupying a permanent caption line.
- Move optional stat hints behind help controls while preserving the value and label.
- Audit high-use learning pages including Labs, Practice, quizzes/exams, Review, Resources, Troubleshoot, Command Line, and Study Plan for standalone explanatory captions not handled by shared components.
- Keep essential content visible: task objectives, prompts, instructions, validation errors, progress/status labels, results, empty-state explanations, safety warnings required before an action, and learner-authored or curriculum content.
- Preserve all routes, actions, progress logic, scoring, saved state, and learning data.

## Interaction and accessibility
- Reuse the existing `HelpTip` component for consistent click, tap, keyboard, and hover behavior.
- Give each help icon a specific accessible label based on its heading or statistic.
- Keep layouts compact on narrow mobile screens and avoid text/button overlap.

## Verification
- Check Labs, Practice, Quiz Me, Exam Simulator, Resources, Troubleshoot, Command Line, and Study Plan at mobile and desktop widths.
- Confirm help text opens by tap/click and keyboard, with no inaccessible or lost essential instructions.
- Run the relevant tests and confirm the preview build is clean.
