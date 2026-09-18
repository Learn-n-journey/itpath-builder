# Calm, Consistent Theme Hierarchy

## Goal
Refine IT PATH’s existing visual system so dark and light modes share one clear hierarchy, reduce glare, and use teal only to signal actions or interactive states.

## Changes
- Tune dark mode to a deep slate-charcoal page background, clearly darker blue-gray navigation, and restrained blue-gray containers with soft off-white text.
- Tune light mode to a pale cool-gray page background, clean white cards and navigation, and deep charcoal text with readable secondary copy.
- Separate structural emphasis from interaction: headings, dividers, status decoration, and passive icons use neutral foreground/border roles rather than teal.
- Keep teal for buttons, links, selected controls, focus rings, progress tied to an action, and other interactive feedback.
- Preserve warning, success, destructive, chart, and terminal-specific colors where they communicate meaning rather than branding.
- Keep the existing layout, typography, content, and theme selector behavior unchanged.

## Validation
- Check dark and light dashboard views at desktop and mobile widths.
- Confirm text contrast, card separation, navigation hierarchy, focus states, and selected controls.
- Confirm no overlaps, missing styling, browser errors, or build errors.

## Technical details
- Update semantic OKLCH theme values and fallback colors in the global design system.
- Replace decorative or passive uses of the primary accent in shared UI primitives with neutral semantic roles.
- Reuse existing theme tokens and controls; no new color literals in feature components.
