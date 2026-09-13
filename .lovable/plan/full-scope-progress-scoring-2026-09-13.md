# Full-scope progress scoring

## Goal
Make every progress, mastery, readiness, and skill percentage reflect correct or completed work against the complete relevant content pool. Untouched material will always count as zero rather than disappearing from the denominator.

## What will change
- Create a shared evidence-and-coverage calculation used by topic, certification, learner, career-skill, dashboard, progress, and exported-record views.
- Score each unique available question, practice task, lab, incident, ticket, review target, and command-line scenario once, using the learner's strongest completed result while keeping unattempted items at zero.
- Replace fixed jumps and attempted-only averages where they are presented as progress or mastery.
- Keep attempt averages as separate performance statistics, clearly labeled as such.
- Show coverage context beside important scores, such as “1 of 18 activities completed correctly,” so a single perfect result cannot imply broad readiness.

## Technical details
- Derive six topic dimensions from static content plus persisted attempts instead of trusting optimistic stored percentages.
- Use each certification’s entire mapped topic and activity/question pools as its denominator; remove fixed sample-size shortcuts.
- Include all relevant incidents and career tickets in troubleshooting coverage.
- Calculate learner-wide mastery across all curriculum concepts, not only studied concepts.
- Add deterministic checks proving empty data is 0%, one correct activity remains proportional to the full pool, and complete correct evidence can reach 100%.

## Verification
- Run focused calculation tests and the project checks.
- Inspect Dashboard, Progress, Learner Profile, Career Skills, and certification views at desktop and mobile sizes.
