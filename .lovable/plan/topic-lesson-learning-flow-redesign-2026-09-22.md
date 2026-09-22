# Topic lesson learning-flow redesign

## What will change
- Reorganize the existing topic page into five clear stages: **Read It**, **See It**, **Try It**, **Prove It**, and **Keep Handy**.
- Keep the current progressive lesson accordion, with only the first lesson part open initially and deep links opening the correct part.
- Move existing material rather than duplicate it: introductions and core teaching into Read It; examples, walkthroughs, misconceptions, and exam traps into See It; self-check, practice, recall, and optional hands-on work into Try It; teach back, scenario, labs, and the section quiz into Prove It; terms, reference, sources, media, notes, and supporting material into Keep Handy.
- Restore the existing saved recall activity inside Try It, clearly label all Try It work as practice, and preserve every current save, score, AI-feedback, and progress update.
- Update study-stage links to the new anchors and remove the old reading-pace wording.

## Safety boundaries
- Do not change prerequisite locking, mastery requirements, quiz rules, scoring, progress calculations, workbook parsing/imports, owner-content precedence, routes, or database behavior.
- Reuse the existing lesson, depth, examples, mastery, lab, notes, sources, and media components; adjust them only enough to support the new placement.
- Preserve owner-authored lessons and newly imported topics automatically through the same data selectors.

## Verification
- Check the no-loss inventory against the rendered page, including conditional activities.
- Test lesson-part deep links and every study-stage jump target.
- Confirm locked topics still show the same gate before lesson content.
- Confirm owner-fed content paths and workbook-backed recall/practice/scenario/lab selectors remain intact.
- Inspect desktop and phone layouts, then run the relevant lesson/mastery tests and confirm the preview build is clean.
