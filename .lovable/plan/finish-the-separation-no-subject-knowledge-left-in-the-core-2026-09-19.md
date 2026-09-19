# Finish the separation: no subject knowledge left in the core

Yes, this is possible, and the remaining coupling is small and contained. Two
places still know that the subject is IT:

1. `src/content/course-pack.ts` names the IT pack directly, so it is a second
   switch that can disagree with the subject chosen in the registry.
2. `src/lib/quality/audit.ts` reads IT material modules directly (sections,
   lessons, deep lessons, modules, question pools, stage exams), so the
   general checker only ever checks IT.

Everything else already goes through the pack or the registry.

## What changes

### One switch instead of two
The registry becomes the only place a subject is chosen. Each registered
subject may carry its material pack alongside its manifest and definition, and
`course-pack.ts` simply hands back the active subject's pack. If a subject is
made active without material, the app says exactly that instead of quietly
teaching IT.

### The checker reads the active subject, not IT
`runContentAudit` becomes `auditCoursePack(pack, options)` with the active pack
as the default. It stops importing anything from the IT material folder and
asks the pack for what it needs: sections, teaching text, question pools,
papers, paper sizes and exams. The rules, findings, severities and stable ids
stay exactly as they are, so the gate, pipeline, activation script and the
ledger keep working unchanged.

Two small additions to the pack contract cover what the checker currently gets
from IT modules directly:
- `lessonText(sectionId)` — everything a section teaches, as one block of text
- `sectionQuizDraw(sectionId, nonce)` — a fresh paper for the same section

The IT pack supplies both from its existing functions, so IT behaviour is
byte-for-byte the same.

### A shared findings type
`Finding` and `Severity` move to `src/lib/quality/types.ts`. Today the domain
validator, generator and package auditor import the finding type *from the IT
auditor*, which is the wrong direction. Existing import paths keep working via
re-export.

### Generated subjects get material too
A small adapter turns a generated domain package (Auto Repair today) into a
pack that satisfies the same contract, so activating a generated subject
switches both wording and material with one key.

## Proof

- All existing tests, the typecheck and the build pass unchanged.
- `bun run gate` and `bun run audit` produce the same findings for IT as today.
- Activating Auto Repair switches the material as well as the wording, the
  general checker audits Auto Repair's own content, then rollback to IT.
- No file outside `src/content` and `src/domain` imports IT material.

## Technical notes

- `RegistryEntry` gains an optional `coursePack`; `activeCoursePack()` resolves
  it and throws a named error when absent.
- `audit.ts` keeps `runContentAudit` as a thin wrapper over
  `auditCoursePack(coursePack, options)` so no script changes are required.
- Stage exam auditing uses `pack.assessmentSizes.stageExam`; section papers use
  `pack.assessmentSizes.sectionQuiz`. No constants imported from IT data.
