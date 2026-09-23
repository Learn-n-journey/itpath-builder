# Cohesive IT PATH learner interface

## Goal
Make the learner experience feel like one compact mobile product, using the supplied reference for structure, spacing, hierarchy, density, navigation, and information patterns. Keep IT PATH's current colors, fonts, branding, routes, data, permissions, progress rules, recommendations, assessments, and actions unchanged.

## Shared app structure
- Rework the signed-in app shell around one compact sticky header: menu, IT PATH brand/current page, and search.
- Add a persistent mobile bottom bar with Dashboard, My Path, Learn, Certifications, and More. More opens the existing grouped navigation, so every secondary feature remains available.
- Keep the desktop sidebar, but tighten its spacing and align its active states and labels with the mobile shell.
- Remove the floating quick-navigation button. Move GAYL and Second Brain access into stable navigation/header positions so they remain available without covering page content.
- Reserve enough bottom space for the mobile bar and preserve safe-area support.

## Shared interface components
Create or refactor reusable compact components for:
- page and section headers;
- the standard progress bar and percentage placement;
- compact metric summaries;
- clickable content rows with icon, title, metadata, status/progress, and chevron;
- certification and activity rows;
- search, filter chips, expandable filter controls, status indicators, and empty states.

These components will use the existing semantic color tokens and current fonts. Cards will represent clickable or genuinely grouped objects; ordinary sections will use open layouts and dividers.

## Named learner screens
- **Dashboard:** one compact Continue Learning area first, then progress, reviews, today's work, certifications, and career readiness. Keep the current next-action and real-progress calculations.
- **My Path:** compact introduction and total progress, List View/Journey Map controls, certification stages on a vertical milestone line, dense certification cards, and one prominent action only for the current/recommended certification.
- **Learn:** recommended next topic, compact search/filter controls, then dense topic rows showing certification, description, status/progress, and navigation.
- **Practice and Labs:** compact inventory counts and controls above dense activity rows; preserve task selection, shuffling, deep links, gates, saved attempts, evaluation, and workspaces.
- **Daily Challenge:** difficulty selection and one Start action first; compact streak/attempt/best metrics and seven-day history next; explanations become expandable.
- **Resources:** visible search plus compact chips/Filters disclosure; resource rows become the focus while preserving external links, verification, bookmarks, and notes.
- **Study Plan:** session length and Generate Session first; active plans become an ordered activity timeline; totals, history, and manual logging move below.
- **Pomodoro:** timer and controls immediately after the title; supporting metrics next; block-length configuration below.

## Global consistency pass
Apply the same page rhythm, compact headers, interactive-row pattern, status treatment, and progress visualization across the remaining signed-in learner pages without redesigning their business logic. Public guides and the owner control room retain their role-specific structures while inheriting safe shared spacing where appropriate.

## Technical details
- Keep TanStack route files and all existing route destinations intact.
- Derive active navigation from the current route and preserve the existing command palette, attention counts, course switching, owner-only visibility, Pro gates, annotations, and responsive sidebar.
- Consolidate repeated page markup into shared components rather than duplicating styling.
- Do not alter the existing theme values or introduce a second palette.

## Verification
- Check Dashboard, My Path, Learn, Practice, Labs, Resources, Daily Challenge, Study Plan, and Pomodoro at a 430px mobile viewport and desktop width.
- Verify bottom navigation, More drawer, menu, search, active states, deep links, filters, shuffle, progress, saved attempts, timers, study-plan controls, resource actions, and GAYL access.
- Run focused behavior tests, the full automated test suite, TypeScript checks, and confirm the preview build and runtime logs are clean.
