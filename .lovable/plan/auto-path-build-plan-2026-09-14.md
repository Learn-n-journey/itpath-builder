# AUTO PATH — Build Plan

## Goal
Create a separate, sellable auto-repair education app based on the IT PATH architecture. All IT/cybersecurity/CompTIA content is replaced with beginner-to-advanced automotive repair content. The same learning engine, paywall tiers, command-line simulator, AI tutor, and study-plan mechanics are reused.

## Why a new project
IT PATH already has live Paddle payments and a custom domain. Lovable does not support duplicating projects with payments enabled, and the live app must stay untouched. AUTO PATH therefore lives in its own project, built from the same patterns but with fresh content and its own product catalog.

## Reused architecture (copy the engine, not the content)
- TanStack Start + Lovable Cloud + Supabase auth
- Versioned user data with localStorage offline cache and cloud sync
- Pro / Plus payment tiers via Paddle
- Theme switcher (dark/light/system)
- Account creation with first-name capture
- Adaptive Learning Intelligence Engine (learner model, diagnosis, scheduling)
- Study plan with daily time target and exact-minute task allocation
- Five learning stages per topic: Learn, Recall, Practice, Teach Back, Real-World Scenario
- Quiz me, weak areas, review, insights, command-line simulator, labs, troubleshooting incidents, career tickets
- AI Tutor with thread history
- AI Second Brain for saved notes, PDFs, links, screenshots
- AI grading with offline fallback and daily usage limits

## New content structure
Replace the four IT phases with four auto-repair phases, each containing topics, lessons, recall items, practice tasks, scenarios, quizzes, labs, and incidents.

### Phase 1 — Foundations
For someone who has never opened the hood.
- Shop safety, tool identification, fastener basics
- Engine basics: how an engine works, four-stroke cycle
- Fluids and maintenance: oil, coolant, brake, transmission, washer
- Tires, wheels, and basic inspections
- Battery, starting, and charging overview
- Under-car inspection and lifting/safely supporting a vehicle
- Basic electrical: voltage, current, resistance, multimeter intro
- Reading service information and VIN decoding

### Phase 2 — Maintenance and Light Repair
Entry-level technician work.
- Oil and filter changes
- Brake inspection and pad/rotor replacement
- Tire rotation, balancing, and repair
- Battery testing and replacement
- Headlight/taillight and wiper replacement
- Fluid exchanges (coolant, brake, transmission)
- Belt and hose inspection/replacement
- HVAC basics: refrigerant cycle and cabin filter
- Pre-purchase inspection

### Phase 3 — Engine, Electrical, and Drivability
Intermediate diagnosis and repair.
- Engine mechanical: timing, compression, leaks
- Fuel injection and ignition systems
- Onboard diagnostics (OBD-II), reading and clearing codes
- Sensor operation: O2, MAF, MAP, crank/cam, knock, etc.
- Charging and starting system diagnosis
- Wiring diagrams, multimeter use, circuit testing
- Emissions systems: EVAP, EGR, catalytic converter
- Cooling system diagnosis
- Basic drivability: misfires, hesitation, stalling

### Phase 4 — Advanced Systems and Troubleshooting
Specialist-level preparation.
- Automatic transmission fundamentals
- Manual transmission and clutch
- Drivetrain: axles, CV joints, differentials, 4WD/AWD
- Steering, suspension, and alignment
- ABS, traction control, stability control
- Airbag and restraint systems
- Hybrid and electric vehicle safety and service
- Advanced scan-tool data and bi-directional controls
- Diagnostic strategy and case studies

## Certifications mapped to phases
- Phase 1 → Basic Car Care / DIY Maintenance
- Phase 2 → Maintenance & Light Repair (entry-level tech)
- Phase 3 → Engine & Electrical Diagnosis
- Phase 4 → Advanced Automotive Technician

These are internal milestones, not official ASE credentials. Copy must state clearly that the app prepares users for knowledge and skills, not for issuing certificates.

## Command-line simulator conversion
Keep the same VM/shell engine, but scenarios use automotive scan-tool and service-info commands instead of IT commands.
- OBD-II mode: `mode 01 pid 0C` (engine RPM), `mode 03` (trouble codes), `mode 04` (clear codes), `mode 06` (test results)
- Service-info mode: lookup TSBs, wiring diagrams, torque specs
- Shop management mode: parts lookup, labor time estimates
- Multi-step diagnostic scenarios: no-start, misfire, overheating, warning light, parasitic draw
- Shells: Windows shop PC, Linux shop PC, generic scan-tool terminal, Android shop tablet

## AI Tutor and Second Brain
Same implementation, context rebuilt from auto-repair learner records. The tutor answers questions about engines, electrical, diagnostics, tools, and safety.

## Labs, incidents, career tickets
- Labs: virtual procedures (oil change, brake pad replacement, tire rotation, battery test, OBD-II code scan)
- Incidents: realistic troubleshooting tickets (customer complaint → diagnose → repair → verify)
- Career tickets: service-writer-style tasks (estimate repair, explain diagnosis to customer, order parts)

## Content sources and accuracy rule
All facts must come from manufacturer service manuals, ASE test-prep publishers, NHTSA, EPA, or established trade references. Never invent torque specs, wiring colors, or diagnostic procedures. Where a procedure varies by make/model, note the variation and point the user to the specific service manual.

## Payment tiers
Same as IT PATH:
- Free: lessons, recall, basic quizzes, limited practice
- Plus ($7/month or $69/year): adaptive engine, labs, incident simulator, command-line simulator, exam simulator
- Pro ($15/month or $149/year): everything in Plus plus AI Tutor, AI grading, Second Brain

## Build steps
1. Create a new Lovable project and enable Lovable Cloud + Google auth.
2. Port the shared framework: theme, auth, app state, navigation, layout, paywall, pricing, settings, about, guide.
3. Port the learning engine: learner model, intelligence engine, study plan, review, next-action, readiness.
4. Port the simulator engine and rewrite scenarios for automotive commands.
5. Port AI tutor, Second Brain, and grading with auto-repair system prompts.
6. Write Phase 1 content first (foundations) so the app is usable immediately.
7. Add Phases 2–4 in order.
8. Set up Paddle products/prices for Plus and Pro in the new project.
9. Add owner/beta access list and publish.

## Migration from IT PATH
No user data migrates; this is a fresh product. Only code patterns and components are reused. The new project starts with a clean database and empty user base.

## Risks and decisions
- **Scope**: four phases is large. Ship Phase 1 + framework first, then add phases iteratively.
- **Accuracy**: automotive repair has safety implications. Every procedure needs a "consult the vehicle-specific service manual" disclaimer.
- **Certification alignment**: decide whether to align topics with ASE test areas (A1–A8) or keep internal milestones. Recommended: map internal milestones loosely to ASE areas but do not claim ASE endorsement.
- **Simulator realism**: scan-tool commands are simplified but must be plausible. Use real SAE J1979 modes/PIDs where applicable.

## Success criteria
- A new user can create an account, set a daily study time, and complete a full Phase 1 topic in one session.
- Plus and Pro paywalls gate the correct features.
- Command-line simulator runs a no-start diagnostic scenario end-to-end.
- AI Tutor can answer "Why is my check engine light on?" using the learner's current progress.
