# IT PATH Lab Engine

## Goal
Build the requested guided Lab system inside the existing IT PATH architecture and visual system, without claiming access to any external machine, network, cloud account, or security environment.

## What will be built
- Add nine substantive labs: Hardware, Windows, Networking, Linux, PowerShell, Bash, DNS, Security, and Cloud.
- Give every lab a stable ID, related topic, objective, prerequisites, difficulty, estimated time, environment, ordered instructions, expected result, checklist, reflection prompt, and scoring rules.
- Replace the empty Labs page with a lab library and reusable workspace using the existing page, panel, button, badge, checkbox, progress, and form patterns.
- Support the complete lifecycle: Not Started → In Progress → Submit → Needs Review or Completed → Review → Mastered.
- Keep opening a lab at Not Started. Start creates the attempt; Save persists checklist and reflection; Submit records the work; Review shows the saved evidence and score.
- Make scoring honest and checklist-based. The app records the learner’s confirmations and reflection, while clearly stating it did not inspect or access an external environment.
- Connect completed and mastered lab attempts to Portfolio as traceable lab evidence, without duplicating entries.

## Data and persistence
- Advance the data version and expand the typed `Lab` and `LabAttempt` models with checklist state, reflection, score, lifecycle timestamps, and portfolio linkage.
- Extend `PortfolioProject`, notes/bookmarks relationships where required, centralized immutable mutations, app actions, safe migration defaults, selectors, and diagnostics.
- Preserve the existing zero state and LocalStorage architecture; no backend, authentication, or external services.

## Verification
- Test all nine labs open with correct content and IDs.
- Test Start, Save, checklist persistence, reflection persistence, Submit, Needs Review, Completed, Review, and Mastered transitions.
- Refresh during the lifecycle and confirm status, score, checklist, reflection, and Portfolio evidence persist.
- Verify zero-state behavior, no false external-access claims, diagnostics, desktop/mobile rendering, navigation, console/runtime errors, and the final build.