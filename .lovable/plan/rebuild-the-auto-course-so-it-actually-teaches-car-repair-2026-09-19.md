# Rebuild the auto course so it actually teaches car repair

## Where it stands today

The IT course and the auto course are not in the same league:

| | IT course | Auto course |
|---|---|---|
| Sections | 128 | 86 |
| Lesson writing | ~1.1 MB of deep, multi-part lessons | ~80 KB total (about 150 words per section) |
| Questions | 5,520 | 258 (3 per section) |
| Exams | 264 papers | 9 |
| Hands-on labs | yes | none |
| Work tickets / real-world scenarios | yes | none |
| Keywords, teach-back, recall | full | partial |

So the auto course is really an outline. It names the right ASE areas but never walks a learner
through diagnosing and fixing anything. This plan rebuilds it as a full course.

## What "teaches how to fix cars" means here

The IT course works because every section answers four things: how the thing works, how to tell
when it is broken, what to do about it, and then makes you prove it. The auto course gets the same
four, expressed in shop terms:

1. **How the system works** — the mechanical/electrical story, with the numbers a technician
   actually quotes (torque specs, pressures, resistances, clearances).
2. **Symptom to cause** — the complaint a customer makes, what it usually means, and what it can
   also mean.
3. **The diagnostic procedure** — the ordered steps, the tool used at each step, the reading that
   confirms or clears each cause, and the stop-condition.
4. **The repair and the verification** — how the fix is done, the torque and fill specs, and how
   you prove the complaint is gone before the car leaves.

## Scope of the rebuild

New versioned package `auto-repair@3.0.0`, built through the existing pipeline. The current
2.0.0 stays registered and reversible until 3.0.0 passes.

- **Sections:** ~110, covering A1–A8 plus G1, each an ASE task-list item rather than a broad topic.
- **Lessons:** full depth per section (how it works / symptoms / diagnosis / repair / verification /
  safety), comparable in length to the IT deep lessons.
- **Questions:** 40+ per section (target ~4,400), every one tied to a concept id, every one with a
  stated context — no "what comes next" without a described complaint.
- **Exams:** one certification test per ASE area plus stage exams, sized exactly as declared.
- **Diagnostic walkthroughs:** the auto equivalent of IT's labs and tickets — a repair order comes
  in with a complaint, the learner picks the next diagnostic step and reads a real instrument value,
  and reaches a verdict. Wrong branches explain the cost of that detour.
- **Sources:** every section cites verifiable references (ASE task lists, SAE/NIOSH safety,
  manufacturer service information practice, established teaching channels).

## Interactive tools (previously requested, still open)

- **Virtual OBD-II scanner** — connect, read stored/pending codes, freeze-frame, live data PIDs,
  monitor readiness, clear codes. Wired to the diagnostic walkthroughs so a scan tells you something.
- **Virtual engine bay** — clickable four-stroke engine, like the virtual motherboard: hover a
  component, see what it does, what fails, and which symptom it produces.

## Quality gates (unchanged, deterministic)

Everything goes through the existing loop: generate → validate → independent QA audit → correct →
retest → approve → activate → monitor → roll back on degradation. The AI writes; it never approves.
Additions to the auto rule set: every diagnostic step names a tool and an expected reading; every
repair names a verification; no torque/pressure/clearance figure without a cited source; no question
without context.

## Technical notes

- Built with `bun run domain` into `src/content/packs/auto-repair/3.0.0/`, registered in
  `src/domain/registry.ts`; `ACTIVE_PACKAGE` stays `it-cybersecurity@1.0.0`.
- Package contract gains optional `labs`, `tickets`, and `scenarios` arrays so generated domains can
  carry hands-on material; `src/data/domain-overlay.ts` surfaces them, and the topic page shows the
  Practice and Real-World tabs when present (today they are authored-IT-only).
- Auto stays owner-only and selectable; IT behaviour and IT content are untouched.
- Content generation runs in batches with an audit between batches, so a failing batch is corrected
  before the next one is written.

## Order of work

1. Contract + overlay support for labs/tickets/scenarios (no content change yet).
2. Section map for A1–A8 + G1 from the published ASE task lists.
3. Lesson and question generation in batches, audited per batch.
4. Exams and diagnostic walkthroughs.
5. Virtual OBD-II scanner and virtual engine bay.
6. Full pipeline run, activation test, rollback to IT, regression suite.
