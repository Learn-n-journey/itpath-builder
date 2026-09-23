# IT PATH learner UX polish pass

## Goal
Make the existing learner experience feel responsive, consistent, and finished without changing learning data, mastery, prerequisites, recommendations, scoring, authentication, or progress behavior.

## What will change

### 1. Shared loading and feedback patterns
- Add reusable, shape-matched skeletons for page headers, metrics, content rows, detail workspaces, and timelines.
- Show those skeletons while device progress and signed-in data hydrate on Dashboard, My Path, Learn, Certifications, Practice, Labs, Resources, Daily Challenge, Study Plan, Review, and other primary data-driven learner screens.
- Keep skeleton dimensions close to final content to prevent layout shifts.
- Standardize subtle success feedback with concise messages, checkmarks, status transitions, and progress movement only.

### 2. Consistent interaction and motion
- Standardize 150–250ms press, row, disclosure, status, and progress transitions through shared components and global motion rules.
- Preserve keyboard focus, touch targets, and reduced-motion behavior.
- Make interactive rows follow one model: the row opens the item, a chevron indicates drill-in, the primary button performs the main action, and secondary controls stay separate.

### 3. Empty states and learner-facing statuses
- Create one compact empty-state treatment with a concise title, optional short explanation, and at most one useful action.
- Apply it across Review, Practice, Labs, Study Plan, history/activity areas, and other relevant learner screens.
- Centralize learner-facing labels around: Not started, In progress, Due for review, Mastered, and Locked, mapping existing internal states without changing them.

### 4. Remember presentation choices
- Add a small local UI-preference utility separate from learner progress.
- Preserve appropriate choices such as My Path List/Journey view, expanded certifications, Learn filters/search, Practice certification, Labs selection/filtering, and similar view-only settings.
- Validate stored values and fall back safely when content changes.

### 5. Orientation and safe continuation
- Add compact breadcrumbs to deeper topic, certification, quiz, practice, lab, review, exam, and other activity screens where curriculum context is known.
- Add contextual next actions after completion by reusing the existing journey, resume, mastery, and prerequisite selectors.
- Only show actions that are already unlocked and valid; locked content remains locked.

### 6. Progressive disclosure and responsive refinement
- Reuse the existing sheet/dialog/details primitives consistently for filters, reasoning, evidence, settings, source details, and other secondary information.
- Keep the result or recommended action visible first; move advanced detail behind a consistent Details, Why this?, Evidence, or How this works control.
- Tighten maximum widths and introduce tablet/desktop columns only where they improve scanning, while preserving the mobile-first structure and fixed navigation clearances.

### 7. Verification
- Add focused tests for status mapping, saved UI preferences, skeleton/hydration states, safe next-action selection, and breadcrumbs.
- Run the existing automated test suite.
- Visually check all major learner routes at mobile, tablet, and desktop widths for overflow, clipping, collisions, spacing, wrapping, fixed navigation clearance, and layout stability.
- Exercise navigation, search, filters, disclosures, List/Journey selection, locked/open content, completion actions, resources, study-plan generation, Pomodoro controls, and GAYL access.

## Technical boundaries
- Presentation components will wrap existing selectors and actions; learning and persistence logic will not be rewritten.
- UI preferences will use separate namespaced browser storage and will never be counted as learning activity or synced as progress.
- Existing semantic color and typography tokens remain unchanged.
- No new learner features, rewards system, confetti, glow, or long-running animation will be added.
