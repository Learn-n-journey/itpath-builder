# AUTO PATH — an auto repair version of IT PATH

## Short answer on difficulty

The machinery is the hard part, and it is already built and proven. Everything that makes IT PATH work — progress tracking, the adaptive learning engine, quizzes, recall grading, labs, incidents, the AI tutor, accounts, payments, light/dark themes, the paywall — is subject-neutral. It reads from data files, not from anything CompTIA-specific.

So the real work is not engineering. It is writing the auto repair curriculum: topics, lessons, questions, practice tasks, labs, scenarios, and the scan-tool simulator content. That is the same effort that went into the IT curriculum, and it is the bulk of the project.

Rough split: about 20 percent rewiring and renaming, about 80 percent writing content.

## How the new app gets created

This is a separate app, so it starts as a copy of this project in your Lovable account, then gets rebuilt inside that copy. Nothing in IT PATH changes. You keep two apps, two domains, two subscriber lists.

## What gets removed

- All CompTIA curriculum data: topics, lessons, deep lessons, recall, practice, scenarios, quizzes, question banks, labs, tickets, incidents, worked examples.
- The command-line simulator (Windows CMD, PowerShell, Linux, Android, iOS) and its scenarios.
- Professor Messer video links and the IT resource library.
- IT-specific wording across the dashboard, about, pricing, guide and paywall pages.

## What stays exactly as is

- Accounts, sign-in, per-account fresh starts, cloud sync, offline cache.
- The adaptive learning engine and learner model.
- Progress scoring against full scope, streaks, study plan, Pomodoro, review and weak areas.
- AI tutor, AI grading, Second Brain, self-checks, daily AI limits and caching.
- Payments, Plus and Pro tiers, paywall, beta access.
- Theme system, layout, navigation shell, SEO plumbing.

## The new curriculum

Structure mirrors IT PATH: beginner foundation, then core, then advanced, with both framings you asked for — skill levels up front, ASE certification mapping shown for learners who want an exam target.

Proposed phases:

1. Foundation — shop safety, hand and power tools, fasteners and torque, measuring, vehicle systems overview, service writing and customer communication.
2. Core systems — engine repair (A1), automatic transmission (A2), manual drivetrain and axles (A3), suspension and steering (A4), brakes (A5).
3. Electrical and comfort — electrical and electronic systems (A6), heating and air conditioning (A7).
4. Advanced — engine performance and emissions (A8), diagnostic strategy, hybrid and EV fundamentals, ADAS awareness.

Each topic carries the same five-stage treatment already built: lesson, recall, practice, teach back, real-world scenario — plus a deep lesson layer, quiz questions, labs, and shop incidents.

## The scan-tool simulator

This replaces the command-line simulator and reuses its whole architecture: persistent virtual state, scenario generation, guided and challenge modes, hints with revealable exact steps, scoring on process not just outcome, AI-generated random scenarios, and the same learner-model feedback loop.

In auto form, the learner works a simulated vehicle: pull diagnostic trouble codes, read freeze frame data, watch live sensor values, run actuator tests, clear codes, and re-verify the repair. Scenarios span misfires, lean and rich conditions, EVAP leaks, ABS and wheel speed faults, charging system faults, and no-start diagnosis.

Guided mode explains why each step narrows the cause. Challenge mode scores whether the learner diagnosed efficiently or replaced parts by guessing.

## Technical notes

- Curriculum lives in the same shape: `TopicSeed` slugs in `src/data/curriculum/phase-*.ts` derive topic, lesson, recall, practice and scenario ids automatically; `src/data/deep-lessons/` supplies the long-form lesson and depth layers; `src/data/question-bank.ts`, `lab-content.ts`, `incident-content.ts`, `ticket-content.ts` supply the activity banks. Replacing content means replacing these files, not the engines that read them.
- `src/lib/cert-path.ts` and `src/data/certification-content.ts` get ASE definitions in place of CompTIA ones.
- The simulator reuses `src/lib/terminal/machine.ts`, `session.ts` and `scenarios.ts` renamed to a vehicle domain: the machine becomes a vehicle state (codes, sensor PIDs, component states), shells become scan-tool menus rather than command parsers, and scenario scoring, misconception tagging and adaptive selection carry over unchanged.
- Resource links must come from real, verified sources only — NHTSA, EPA, SAE, manufacturer service information portals, ASE study guides. No invented URLs, same rule as the IT app.
- Payments, domain and Search Console are per-app and get set up fresh for the new one.

## Suggested build order

1. Copy the project, strip IT content, rename and rebrand.
2. Foundation phase content end to end, so one complete phase proves the pipeline.
3. Core systems phases A1-A5.
4. Electrical, HVAC, advanced performance.
5. Scan-tool simulator.
6. Labs, incidents, shop tickets, resource library.
7. Payments, SEO, publish.

Each step is independently shippable — you could launch with the foundation phase and add systems over time.
