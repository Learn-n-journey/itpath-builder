# Adaptive certification starting points

## What will change
- Remove the Gentle, Standard, and Challenging setting and every learner-facing difficulty label or filter.
- Use the selected certification as the primary course focus across the dashboard, Learn, My Path, Certifications, Practice, Resources, Labs, quizzes, and generated study sessions.
- Use experience level to choose the first recommended topic within that certification:
  - Complete beginner: begin with the certification’s groundwork.
  - Some basics: begin at the first core topic, while keeping prerequisites accessible.
  - Home lab experience: begin at core applied material.
  - Working in IT already: begin at the first advanced topic, falling back to the nearest available earlier topic.
- Show a clear “recommended starting point” with a direct action, while keeping the full certification available for learners who want another topic.
- Make selected certification controls use the complete live certification list rather than a short hard-coded list.

## Technical details
- Add one shared path-personalization helper that resolves the selected certification, experience-based start stage, recommended topic, and ordered focused topics.
- Reuse that helper in dashboard task selection, study-plan generation, certification pages, Learn ordering, and default selections on activity pages.
- Keep existing internal difficulty data for curriculum ordering and study-time calculations, but never expose its labels on app pages or in generated tutor prompts.
- Preserve existing progress, attempts, persistence, and all learning content.

## Validation
- Check all app pages for remaining learner-visible Gentle, Standard, or Challenging text.
- Verify a settings change immediately changes the recommended certification and starting topic.
- Verify new users still start at zero and existing activity is not changed.
- Test desktop and mobile navigation paths and confirm the app builds without errors.
