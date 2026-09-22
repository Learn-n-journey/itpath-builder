# Make Excel sync resilient and lighter

## What will change
- Retry temporary Excel errors (`429`, `503`, and `504`) with the provider’s requested cooldown when available, otherwise with capped exponential delays.
- Read each worksheet’s dimensions first, then fetch its values in bounded row batches instead of opening the full used range in one request.
- Keep all workbook operations sequential so Excel is never asked to process competing requests for the same file.
- Preserve the existing safety rule: a broken or unreadable quiz workbook never replaces working questions.
- Improve the recorded failure message when Excel remains unavailable after all retries.

## Technical details
- Centralize retry and response handling in the existing Microsoft Excel request helper.
- Add helpers for Excel column addresses and paged worksheet reads.
- Reuse the same paged reader for lesson, try-it, lab, and quiz workbooks.
- Do not change spreadsheet layouts, sync scheduling, course content, or database structure.

## Verification
- Run focused tests/type validation through the project harness.
- Confirm the preview build is clean and inspect the final sync request flow for full-range calls.
