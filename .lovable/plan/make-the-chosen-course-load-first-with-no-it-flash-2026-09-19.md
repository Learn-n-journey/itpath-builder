# Make the chosen course load first, with no IT flash

## The problem (confirmed)

The course choice is saved only inside the browser, and the page is built on the
server before the browser is involved. So every refresh starts as the IT course —
IT sections, IT colours — and only swaps to the auto course a moment later.

## What to change

1. Remember the choice in a way the server can read too: when the course is
   switched in Settings, save it both in the browser and in a small cookie
   (`itpath.active-domain`, one year, same site).
2. Read that cookie on the server at the start of each page request and treat it
   as the chosen course for that request.
3. Replace the one-time, load-once course lookup with a per-request lookup, so
   the course material, the stage names and the page colours are already correct
   in the very first HTML the visitor receives.
4. Keep today's behaviour as the fallback: no cookie means the default IT course,
   exactly as now.

## Technical notes

- `src/lib/active-domain.ts`: add cookie read/write helpers; `setDomainOverride`
  writes both `localStorage` and `document.cookie`.
- Introduce a request-scoped domain context (AsyncLocalStorage-free option:
  resolve in `__root.tsx` `beforeLoad` via a `createServerFn`/`getHeaders()` read
  of the cookie, expose the key through router context).
- The heavy part: `src/domain/active.ts`, `src/data/domain-overlay.ts` and
  `src/data/static-content.ts` currently export module-level constants evaluated
  once at import. These need to become functions of the resolved key (or memoised
  per key), and their many consumers updated to read through the accessor. This
  is the bulk of the work and the reason it is not a one-line fix.
- `src/routes/__root.tsx`: stamp `data-subject` from the request-resolved key.
- Verify: refresh an auto-repair page and confirm the first HTML payload already
  contains automotive section titles and `data-subject="auto-repair"`; confirm IT
  is unchanged; run typecheck, tests and the quality gate.
