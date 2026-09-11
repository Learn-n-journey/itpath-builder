# IT PATH reusable data model

## Goal
Extend the existing foundation into one strongly typed, reusable data architecture without changing the interface, navigation, or zero-state behavior.

## Implementation
- Define every requested entity with a stable `id` and explicit ID-based relationships. Keep curriculum entities read-only and separate from persisted user records.
- Preserve existing saved data by extending the current versioned schema and safe sanitization rather than replacing the storage system.
- Add one centralized static-data registry and typed lookup helpers for topics, lessons, resources, assignments, labs, quizzes, and certifications.
- Add reusable user-data lookup and mutation functions for progress, attempts, mistakes, reviews, tickets, projects, sessions, notes, bookmarks, settings, career skills, and certification progress.
- Expose those mutations through the existing application state provider, while retaining the generic updater temporarily for compatibility with current pages.
- Keep all new activity collections empty by default; no sample attempts, progress, tickets, projects, sessions, or other activity will be inserted.

## Diagnostics
Update System Diagnostics to run real checks for:
- data initialization and honest zero state
- static and user-data retrieval helpers
- an isolated mutation that does not alter the live user’s records
- LocalStorage save and load round trip
- current application data version
- existing application, navigation, storage, and settings checks

## Verification
- Confirm existing saved state still loads safely and new fields receive empty defaults.
- Run diagnostics in the browser and verify every check passes.
- Recheck all 17 navigation destinations and mobile navigation.
- Confirm the build, runtime console, and zero-state counts remain clean.
