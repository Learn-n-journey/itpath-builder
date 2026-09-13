# Expand command-line scenarios

## Goal
Turn the command-line simulator into a broad, replayable practice system with both reliable random variations and optional AI-created challenges.

## Build
- Expand the curated scenario library across Windows CMD, PowerShell, and Mac/Linux, covering networking, services, processes, accounts, permissions, files, logs, storage, and security.
- Add a random-scenario action that prioritizes uncompleted and weak-skill scenarios, avoids immediately repeating the current scenario, and varies safe machine details such as hostnames, users, services, paths, processes, and fault values.
- Add optional AI scenario creation using the existing Pro AI setup. AI output will be strictly validated and converted only into simulator-supported goals, machine states, and commands; invalid output will be rejected rather than creating an unsolvable task.
- Keep generated scenarios attached to their saved attempts so unfinished and completed work remains playable after refresh.
- Update the simulator controls to clearly separate curated random practice from AI-created practice, with loading and error states.
- Feed all results through the existing scoring, misconception, review, and learner systems.

## Technical details
- Extend the serializable scenario/machine configuration rather than branching on every scenario ID.
- Use a protected server function for AI generation and the Lovable AI Gateway streaming Responses API.
- Add deterministic engine checks proving every curated scenario can reach its required final state, plus type, build, desktop, and mobile checks.
