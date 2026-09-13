# Mac/Linux and Windows environment switch

## What will change
- Replace the current three-item Environment menu with a clear two-way switch: **Mac/Linux** and **Windows**.
- When Windows is selected, show a separate shell choice for **CMD** or **PowerShell**.
- Mac/Linux will use the existing Unix-style command environment and Bash scenarios.
- Keep existing saved attempts, scoring, recommendations, hints, and learner-profile updates working.
- Update page wording and metadata so the available environments are accurately described.

## Technical details
- Keep the persisted shell values unchanged (`bash`, `cmd`, `powershell`) so existing saved sessions remain compatible.
- Derive the visible environment from the selected shell and filter scenarios by the active shell.
- Verify switching environments and Windows shells on desktop and mobile, including starting and resuming scenarios.
