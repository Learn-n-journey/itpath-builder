# Concept remediation and exact lesson resume

## Goal
Add targeted review links and per-topic reading resume to the existing **Read It → See It → Try It → Prove It → Keep Handy** lesson flow without changing mastery, scoring, prerequisites, quiz attempts, owner content precedence, or lesson wording.

## What will change

### 1. Stable lesson concepts and anchors
- Add optional stable IDs to lesson sections and relevant activity/question records while preserving every existing data shape.
- Use one canonical resolver that prefers authored IDs and falls back to deterministic IDs for existing built-in and workbook lessons.
- Keep existing public anchors working; add stable concept anchors so heading edits do not silently break new remediation links.
- Build a topic concept map covering lesson parts plus existing summary/support sections.

### 2. Concept-linked remediation
- Map Practice, Check Yourself, Recall, scenarios, labs, and quiz questions to a canonical lesson concept.
- Prefer explicit workbook/authored mappings. Use deterministic source relationships for generated built-in items; never infer a mapping from displayed text at runtime.
- Show **Review this concept** only after an incorrect or weak result and only when a validated mapping exists.
- Open the mapped accordion part, scroll to the teaching, and record remediation as separate learning evidence—not mastery evidence.
- Keep correct answers, scores, attempts, first-attempt state, and mastery unchanged. Quiz remediation remains available only after submission, matching current assessment integrity.
- When possible, return to a fresh equivalent item through existing retake/question-rotation behavior rather than mutating a scored attempt.

### 3. Return to the activity
- Store a short-lived, persisted return context containing activity type, topic, item/attempt, tab, and route.
- Show a compact **Return to practice / recall / quiz / lab / scenario** action while reviewing the linked concept.
- Restore the existing saved activity state: practice and recall responses, scenario text, lab attempt, quiz attempt/review position, and current tab where supported.
- Clear or replace stale return context safely without altering assessment records.

### 4. Exact reading-position resume
- Add a per-topic reading location to the existing learner record: stable section ID, approximate relative offset within that section, content fingerprint/version, and timestamp.
- Observe the active lesson part and save on a throttled schedule plus section changes, activity switches, page hide, and topic exit—never on every scroll event.
- Show **Continue where you left off** for a meaningful partial position, including subtle **Part N of M** and **Read/Reviewed** status that is visually distinct from mastery.
- On continue, open the correct accordion part and restore the approximate position.
- Explicit hashes and navigation intent—including remediation, search, and study-stage links—always override saved position.
- If content changed, fall back in order: stable section, nearest valid section, first lesson part.

### 5. Workbook and owner-content compatibility
- Extend workbook parsing only with optional concept/section ID columns or fields; existing workbooks remain valid unchanged.
- Preserve owner lessons as the authoritative replacement where present.
- Surface missing explicit mappings through quality checks instead of guessing. Required assessment items fail validation when their declared mapping is absent or points to a nonexistent section.

### 6. Quality validation
- Add deterministic checks for:
  - every required assessment item having a valid mapping;
  - every mapped concept resolving within its topic;
  - every remediation anchor being rendered and unique;
  - duplicate concepts resolving to one canonical section;
  - unmapped optional activities being reported without receiving a false link.
- Include these findings in the existing content/package audit paths so broken mappings cannot ship unnoticed.

## Technical approach
- Extend current `UserData`, defaults, sanitizer, mutations, local persistence, and cloud synchronization rather than adding another progress store.
- Keep reading/remediation records outside `TopicProgress`, quiz passes, attempts, and mastery evidence collections.
- Generalize the existing hash-driven accordion opening so initial hashes and later remediation navigation both work.
- Reuse the existing quiz runner, activity state, rotating question pools, and lesson components; add small shared remediation/resume helpers and controls rather than duplicating activity UIs.
- Preserve current legacy anchors (`#read-it`, `#lesson-reading`, lesson-part slugs, activity anchors) for backward compatibility.

## Verification
- Tests for incorrect answer → mapped concept, accordion auto-open, return-to-activity state, per-topic resume, throttled persistence, explicit-link priority, changed/deleted section fallback, legacy owner lessons/workbooks, local signed-out persistence, cloud round-trip sanitization, and required mapping validation.
- Regression assertions that reading and remediation never create quiz passes, change scores, unlock topics, or award mastery.
- Verify Practice, Check Yourself, Recall, scenario, lab, section quiz, and certification quiz behavior; locked topics; owner lessons; mobile and desktop layouts; all anchors.
- Run the full test suite and confirm the preview build is clean.
