# AI self-check before responses

Add a silent review pass that inspects an AI response before it reaches you, corrects what it can, and only shows the checked version. It runs where mistakes matter and is skipped on short, low-stakes replies so answers stay fast.

## What changes for you

- **AI Tutor**: substantial answers get reviewed for factual errors, invented commands, and claims that contradict your saved material. Short back-and-forth replies (a single question, a one-line follow-up) skip the check.
- **AI marking**: every mark is re-checked before you see it — the score must match the feedback, missed points must really be missing from your answer, and the model answer must be correct. Marking is always checked; it drives your progress.
- **AI-created command-line problems**: every generated problem is validated before it loads, so you never get a task the simulator can't actually complete.

Nothing new appears in the interface. No badge, no note — the answer you see is simply the checked one.

## When the check runs

| Surface | Checked | Skipped |
| --- | --- | --- |
| Tutor reply | Long or instructional answers, anything with commands or steps | Short replies, single questions, clarifications |
| Marking | Always | — |
| Generated problem | Always | — |

## Technical detail

New server-only module `src/lib/ai-self-check.server.ts`:

- `shouldSelfCheck(kind, payload)` — cheap gate. Tutor: check when the reply exceeds a length threshold or contains command-like/step content; marking and scenarios always return true.
- `reviewTutorAnswer({ question, answer, knowledge })` — second gateway call (`google/gemini-2.5-flash`, `response_format: json_object`) returning `{ ok: boolean, issues: string[], revised: string }`. On `ok`, the original is returned; otherwise the revised text is returned. Any failure (non-2xx, parse error, timeout) returns the original answer unchanged — the check never blocks a reply.
- `reviewGrade({ question, answer, modelAnswer, expectedPoints, grade })` — verifies score/verdict/missed consistency and returns a corrected `WrittenGrade` shape; clamped and re-validated through the existing `responseShape`-style zod parse before use.

Wiring:

- `src/lib/tutor.functions.ts` — after the answer is parsed, run `shouldSelfCheck("tutor", ...)` then `reviewTutorAnswer`; return the reviewed text in the existing `TutorReply`. No signature change.
- `src/lib/grading.functions.ts` — after building `WrittenGrade`, run `reviewGrade` and return the corrected grade. No signature change, so `ai-marking.tsx` and all call sites are untouched.
- `src/lib/terminal/ai-scenario.functions.ts` — the check is deterministic, not a model call: validate the built scenario against the simulator (goal target exists in the allowed service/process list for the shell, `machineSpec` actually creates the fault, hints non-empty). On failure, retry the generation once; if it fails again, return the existing error message.

Costs and failure behaviour:

- Marking and tutor checks add one extra gateway call each time they run. Scenario validation adds none unless a regeneration is needed.
- 429/402/5xx from the review call are swallowed and the unchecked response is returned — the user never sees a self-check error.

## Verification

- `bunx tsgo --noEmit` and build clean.
- Exercise a tutor question, a Recall/Teach Back marking, and an AI-generated command-line problem end to end, confirming responses still arrive and no new UI appears.
