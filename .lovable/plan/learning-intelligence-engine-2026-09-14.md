# Learning Intelligence Engine

Unify the adaptive pieces IT PATH already has (learner model, scope progress, review, mistakes, readiness, next action, adaptive path) into one engine that decides what to study, why, how it should be taught, at what difficulty, and when it comes back — and updates after every meaningful interaction.

No existing system is duplicated: the new engine reads from the current evidence stream and progress scoring, and the existing screens call the engine instead of each doing their own ranking.

## What the learner gets

- One "next best action" everywhere — dashboard, study plan, and each learning page agree, because they ask the same engine.
- A reason attached to every recommendation, traceable to real recorded work ("you got this right twice but 9 days ago", "you were confident and wrong on subnet masks three times").
- Teaching that changes with the diagnosis: re-read, worked example, guided practice, retrieval drill, scenario, or hands-on, rather than always the same page.
- Difficulty that steps up when accuracy is high and fast, and steps down after repeated failure.
- Review timing based on estimated forgetting per concept, with mixed (interleaved) topics instead of blocks of the same thing.
- A daily plan that fits the study time set in Settings and spends it on the highest-value items for the target certification.

## Diagnoses the engine makes

For every concept it labels the failure type, not just a low score:

| Diagnosis | Signal |
| --- | --- |
| Never learned | no evidence at all |
| Prerequisite gap | underlying concept unproven |
| Retrieval failure | was correct before, wrong now after a gap |
| Misconception | same error cause repeats across attempts |
| Application failure | recall fine, practice/lab/scenario weak |
| Troubleshooting failure | correct facts, poor fault process |
| Confident but wrong | fast, assured, incorrect answers |
| Fading | correct, but overdue against its forgetting curve |
| Solid | keep on spaced maintenance only |

## Technical outline

New folder `src/lib/intelligence/`:

- `types.ts` — `ConceptIntel` (mastery, confidence, retention/forgetting risk, accuracy, response time, efficiency, diagnosis, teaching method, difficulty band, next-review date, priority, evidence sentence) and `LearningPlan`.
- `diagnose.ts` — turns the existing evidence stream + `topicScopeProgress` dimensions into the diagnosis table above. Adds the two signals not currently measured: confident-but-wrong (fast + wrong + high prior mastery) and learning efficiency (mastery gained per recorded minute).
- `prescribe.ts` — diagnosis → teaching method + difficulty band + activity route (lesson, recall drill, quiz, practice, lab, scenario, troubleshoot, terminal, tutor).
- `schedule.ts` — per-concept forgetting-risk review date (reuses the existing review records; does not create a second scheduler) and interleaving so consecutive items come from different concepts.
- `engine.ts` — `buildIntelligence(user, now)`: one memoised model exposing `byTopic`, ranked `queue`, and `planFor(minutes)` that fills the learner's configured session length by value density (mastery gap × forgetting risk × certification weight ÷ minutes).
- `src/hooks/use-intelligence.ts` — single hook, memoised on user data, so every screen reads the same model.

Rewired to call the engine (behaviour changes, no new screens):

- `src/lib/next-action.ts` — ranking replaced by the engine queue; existing `NextAction` shape kept so `/` and cards keep working.
- `src/lib/adaptive-engine.ts` (`/my-path`) — priority and reason come from the engine.
- `src/lib/study-engine.ts` / `/study-plan` — tasks come from `planFor(dailyMinutes)`.
- Selection of items in `/practice`, `/quiz-me`, `/labs`, `/troubleshoot`, `/weak-areas`, `/command-line` — pick by diagnosis and difficulty band instead of order/random-only.
- `/review` — ordering by forgetting risk, interleaved.
- Topic pages — the five stages surface the prescribed method first.
- `src/lib/tutor-prompts.ts` + AI tutor context — send the diagnosis and misconceptions so explanations target the actual failure.
- `readiness-engine` / certification pages — readiness already uses full scope; it gains the diagnosis mix ("3 misconceptions, 5 fading, 2 unproven in practice").

Update loop: the engine is derived state rebuilt from `UserData`, so every recorded answer, grade, lab, ticket or terminal attempt updates it immediately — no extra persistence, no migration.

Verification: `bunx tsgo --noEmit`, build, and a signed-in browser pass over `/`, `/my-path`, `/study-plan`, `/review`, `/practice`, `/quiz-me`, `/certifications`.
