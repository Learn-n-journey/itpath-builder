# Deterministic autonomous learning-quality loop

## Goal
Extend the existing learner intelligence, domain packages, quality gate, activation log, and rollback system into one auditable loop:

```text
Observe → Measure → Apply Rules → Test → Deploy → Monitor → Roll Back → Learn
```

Core decisions remain deterministic. AI is never required to score health, approve a candidate, activate it, or roll it back.

## Build
- Add a domain-neutral health engine that derives stable, versioned snapshots from recorded learner evidence.
  - Concept health: mastery, retention, failures, misconceptions, retries, completion, and time-to-mastery.
  - Lesson health: concept outcomes, completion, retries, and downstream transfer.
  - Assessment health: attempt volume, accuracy, repeat failures, item regressions, and question coverage/quality.
  - Prerequisite health: blocked dependents, prerequisite weakness, and downstream failure.
- Define explicit thresholds and minimum sample sizes in a versioned rule book. Sparse evidence remains “insufficient,” never “bad.”
- Produce stable findings and improvement candidates with IDs, source metrics, triggering rules, proposed deterministic correction, status, and parent version.
- Extend the quality pipeline to compare baseline and candidate health, run package/content/regression tests, and promote only candidates that pass every blocking rule without degrading protected metrics.
- Add post-promotion monitoring and automatic rollback decisions when statistically eligible metrics cross declared degradation limits.
- Add an append-only failure ledger recording failure, cause, correction, validating test, outcome, and prevention rule; repeated failures strengthen the next deterministic decision.
- Preserve existing domain generation and activation commands while adding a single autonomous-loop command and machine-readable reports.
- Keep AI behind an optional advisor/generator interface whose output must enter the same candidate and deterministic approval path.

## Persistence and auditability
- Keep learner-level evidence in the existing local/cloud-synced user record; derived health is recalculated rather than trusted as mutable truth.
- Keep content/package candidate history, decisions, metrics, activation versions, rollback links, and failures in versioned quality ledgers.
- Use stable domain, concept, lesson, assessment, prerequisite, rule, candidate, decision, and failure IDs throughout.

## Verification
- Add focused tests for health calculations, sparse-data handling, threshold findings, stable IDs, candidate comparison, promotion refusal, degradation detection, rollback choice, and failure-ledger prevention rules.
- Run the full existing regression suite and quality audit.
- Exercise the complete loop against a deterministic fixture: observe, identify weakness, create candidate, approve/promote, detect degradation, roll back, and confirm the failure is learned.
