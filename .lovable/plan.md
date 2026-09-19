# Contextual back navigation

## Changes
- Replace the generic “Back” label with the actual previous page name, using the browser session’s route history and page titles.
- Keep a Dashboard fallback when a page was opened directly and has no in-app predecessor.
- Remove the duplicate shared back control at the bottom of pages.
- Mark existing page-specific back links and automatically hide the shared control whenever one is present.

## Verification
- Check navigation between named pages, browser back behavior, direct page entry, and pages with their own back link.
- Verify mobile and desktop layouts and confirm the app remains error-free.
