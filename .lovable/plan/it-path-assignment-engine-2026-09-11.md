# IT PATH Assignment Engine

## Scope
Build the complete assignment lifecycle on the existing data architecture and visual system. Keep progress honest: opening an assignment never completes it, and non-objective work uses explicit learner self-evaluation.

## Data and curriculum
- Expand the typed assignment model with all 13 assignment types, instructions, response prompts, evaluation mode, rubric criteria, and optional objective checks.
- Add a compact set of substantive assignments tied to the eight existing topic IDs, covering every requested assignment type.
- Expand assignment attempts with responses, score, criterion feedback, overall feedback, lifecycle timestamps, status, and retake lineage.
- Link assignment notes, bookmarks, and mistakes by stable assignment and attempt IDs.
- Advance and safely migrate the versioned LocalStorage model without creating activity for existing or new users.

## Lifecycle
- Start creates a real started attempt; opening details alone changes nothing.
- Save persists draft responses while keeping the attempt in progress.
- Submit locks the response for evaluation.
- Evaluate uses objective checks only where deterministic; all other assignments show a learner self-evaluation rubric with criterion evidence and no simulated AI judgment.
- Complete is available only after evaluation and records completion explicitly.
- Review displays the saved response, score, rubric results, feedback, mistakes, notes, and bookmark state.
- Retake creates a fresh linked attempt while preserving prior history.

## Interface
- Keep the existing Assignments page and design system, adding assignment selection, a focused workspace, lifecycle status, rubric, feedback, attempt history, notes, and bookmark controls.
- Ensure every control is functional and disabled when its lifecycle step is unavailable.
- Derive page totals and completion counts only from persisted attempts.

## Verification
- Test every assignment type opens with substantive topic-specific content.
- Run the exact Start → Save → Submit → Evaluate → Complete → Review → Retake lifecycle.
- Verify responses, scores, feedback, statuses, mistakes, notes, bookmarks, and retake history survive refresh.
- Confirm opening alone creates no attempt, non-objective work is labeled self-evaluation, and deterministic work evaluates consistently.
- Check mobile and desktop rendering, diagnostics, console/runtime errors, and the production build.
