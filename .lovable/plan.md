# Replace spreadsheet sync with durable workbook jobs

## What will change
- Turn each sync into a short discovery pass followed by one durable job per changed workbook.
- Process several independent workbook jobs at once; each job saves immediately and cannot erase another workbook’s progress.
- Retry failed workbook jobs individually with increasing cooldowns instead of restarting the course.
- Keep unchanged-workbook detection, safe quiz replacement, live progress, completion summaries, manual sync, and nightly sync.
- Make try-it and lab workbooks update their own topic safely instead of forcing every try-it/lab workbook to be reopened together.

## Reliability model
- A short request lists folders and queues only changed files.
- Each later request claims a small number of workbook jobs, reads them concurrently, saves successful results, and requeues temporary Excel failures.
- Expired claims return to the queue automatically, so a stopped request loses at most one workbook attempt—not the whole run.
- The parent sync finishes only when every workbook job is done, skipped, or has exhausted its retries.

## Technical details
- Add a `sync_work_items` table with workbook identity, course, folder, topic, status, attempts, claim time, result, and error.
- Replace the current full-course `runSheetSync` drain with discovery and per-workbook processing functions.
- Use short worker ticks and atomic claims; retain the existing authenticated owner controls and secured public worker endpoint.
- Merge try-it and lab data with the existing stored topic record so either workbook can be updated independently.
- Update live totals from work-item counts and aggregate final results into the existing sync history.

## Verification
- Confirm a sync queues only changed workbooks.
- Confirm multiple workbooks finish within one tick and a temporary Excel failure retries only that workbook.
- Confirm a dead worker claim is reclaimed without failing the parent sync.
- Confirm broken quiz files keep the previous working questions.
- Confirm the preview build is clean and the latest sync reaches completion.
