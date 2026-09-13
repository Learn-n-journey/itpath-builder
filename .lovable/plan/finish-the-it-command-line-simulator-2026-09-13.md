# Finish the IT Command-Line Simulator

## What I’ll build

- Rewrite the About page in David Boley’s first-person voice while preserving the existing facts, contact address, and version 1.0.
- Add a dedicated Command Line page under Practice with three isolated virtual environments: Windows CMD, PowerShell, and Linux.
- Include guided practice and no-hint challenges built around realistic multi-command incidents involving files, permissions, processes, services, users, networking, storage, and memory.
- Save each virtual machine, transcript, active task, mode, hints, and progress automatically so unfinished work resumes later.
- Evaluate the learner’s command sequence, useful evidence gathered, unsafe or irrelevant choices, and the final machine state rather than matching one exact command.
- Record scores and misconceptions in the existing learner profile, schedule review after weak attempts, and use current weaknesses to recommend the next scenario.
- Provide optional staged hints and post-attempt explanations; challenge mode will not reveal hints during the attempt.

## Experience

```text
Scenario queue → Task brief → Live terminal → Diagnose and repair → Verify → Scored report
                       ↘ autosaved virtual machine and transcript ↗
```

The terminal will support keyboard command history, clear/reset controls, shell-appropriate prompts and output, explicit submit/verify actions, and a visible reminder that it never touches the learner’s real device.

## Technical details

- Keep the existing virtual machine and shell interpreters as the safe execution core.
- Store simulator sessions in the existing versioned user-data system so local persistence and signed-in cloud sync continue to work automatically.
- Add typed simulator session/attempt records, immutable mutations, migration defaults, and a `terminal` learner-signal kind.
- Define scenario success as machine-state predicates plus diagnostic command groups, allowing valid alternative command paths.
- Add targeted engine tests for command effects, scoring, adaptive selection, persistence migration, and misconception detection.
- Add route metadata and verify the page at desktop and mobile sizes with a real guided and challenge flow.
