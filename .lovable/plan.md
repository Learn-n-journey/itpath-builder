# Admin Control Room for IT PATH

One owner-only area at `/admin` that answers four questions on the first screen:
Is the app working? Is the content healthy? Is anything blocking learners? Does anything need me?

Every owner tool that exists today moves into this one place, so Settings goes back to being
learner settings only.

## What moves in (consolidation)

Today's owner-only tools are scattered across Settings and other pages. They move into
`/admin` as tabs, unchanged in behaviour:

- Spreadsheet sync panel + live sync counter + last 3 scans
- Learning paths (create a new path)
- Maintenance screen toggle
- System diagnostics
- Beta access list
- Site engagement
- AI usage / AI dashboard
- Content reports from learners
- Subject (course) switcher
- Link health

Settings keeps only learner settings; the owner sees a single "Admin" link instead.

## The admin area

Mobile-first. A short status strip at the top: Working / Content / Blocking / Needs attention,
each showing Healthy, Warning, Failed or **Not yet checked** — never green just because
nothing ran. Each card shows when it last ran and a Run again button. Details open in a
drill-down, not on the main screen.

Tabs:

1. **Overview** — the four answers, plus anything critical, and Run full health check.
2. **System** — database, sign-in, server functions, content loading, progress saving,
   assessment submission. Shows recent failures and which piece broke, never keys or
   personal data.
3. **Content** — every topic in a list with its health: lesson, quiz, Try It, labs, sources,
   objectives, concept mappings, remediation targets. Open a topic to see exactly which
   check failed. This reuses the existing audit and quality rules as the authority.
4. **Sources** — external reading and video links: dead, invalid, redirected, duplicated.
   Flagged for review only; nothing is ever auto-replaced.
5. **Imports** — what was imported when, whether validation passed, which version is live,
   and whether the live content still matches what was imported (compared by a content
   fingerprint, not timestamps).
6. **Engine** — automated checks of prerequisites, locking, mastery transitions, evidence
   and remediation mappings, concept IDs: cycles, missing prerequisites, dead remediation
   targets, orphan concepts, topics a learner could enter but never finish. Runs against a
   throwaway copy, so no real learner progress can change.
7. **Flows & speed** — counts and trends of failures for sign-in, lesson load, position
   saving, remediation, quiz load/submit, progress saving, payments; plus slow loads, failed
   requests, retries. Aggregate numbers only, no personal content.
8. **Activity log** — timestamped record of imports, validation runs, rejections, source
   failures, approvals, publishing, rollbacks, failed health checks and recoveries.
9. **Tools** — the existing panels listed above.

Filters everywhere: Critical, Warning, Needs review, Healthy, Not yet checked, plus by topic
and by area. Every warning says what failed, what it affects and what to do about it.

## Release gate

New or re-imported content follows: Imported → Validated → Preview → Approved → Live.

- Importing never puts content in front of learners on its own.
- Validation runs first; failing validation blocks publication.
- Preview shows the content exactly as a learner would see it.
- Only the owner can approve and publish, with explicit confirmation.
- The current known-good version stays live until the replacement passes the whole process.
- The previous approved version is kept, so a rollback restores it without rebuilding it by
  hand. Rollback asks for confirmation and never overwrites the only good copy.

## Technical notes

- Route `src/routes/admin.tsx` (plus child tabs), gated by the existing owner email check on
  both the page and every server function it calls.
- New server functions in `src/lib/admin-health.functions.ts`, `src/lib/content-release.functions.ts`,
  `src/lib/admin-activity.functions.ts`, with server-only logic in matching `.server.ts` files.
- Reuse, do not duplicate: `src/lib/quality/audit.ts` + `rules.ts` (content defects),
  `src/lib/question-quality.ts`, `lesson-quality.ts`, `technical-validation.ts`,
  `src/lib/autonomy/*` (health scoring, findings, stable IDs), `src/lib/sheet-sync.*`
  (imports), `src/lib/mastery-gate.ts` / `prerequisite-graph.ts` / `learner-model.ts`
  (engine checks), `link_checks` + `content_audit_runs` tables, `OWNER_EMAILS`,
  `SystemDiagnostics`.
- New tables (additive, backward compatible, RLS owner-read + service-role write):
  - `content_versions` — one row per imported version: topic, kind, content hash, status
    (imported/validated/preview/approved/live/superseded/rolled_back), validation summary,
    payload snapshot, timestamps.
  - `health_runs` / `health_checks` — each check's area, subject, state, detail, last run.
  - `admin_activity` — the activity log.
  - `flow_events` — aggregate per-day counters per flow and outcome (no learner identity).
  - Existing owner tables stay as they are; `owner_lessons` / `owner_questions` /
    `owner_topic_work` gain an optional `content_hash` and `version_id` so the live rows can
    be matched to a version without touching existing data.
- Health checks are read-only by construction: engine diagnostics run on a synthetic learner
  built in memory, and a test asserts no diagnostic writes learner state.

## Tests

Authorization (non-owner blocked at page and server function), health-state calculation
including unknown vs healthy, failed validation blocking publication, approval and publish,
version history, rollback, prerequisite cycle detection, broken concept/remediation mapping
detection, missing content detection, and a guard test proving diagnostics cannot modify
learner mastery or progress. Full existing suite and build run at the end.

## Staging

1. Migration + shared types.
2. Admin shell, owner gate, Overview with real states.
3. System, Content, Engine checks (reusing existing pipelines).
4. Sources, Imports, Flows & speed.
5. Release gate: versions, preview, approve, publish, rollback + activity log.
6. Move the existing owner panels in and strip them out of Settings.
7. Tests, full suite, build.
