# Garage Match motion effects

## What will change
- Animate both parts smoothly between their original and swapped grid positions.
- Add a short dimensional impact burst when a match clears, with sparks, ring shockwave, and debris tied to each removed tile.
- Keep cascades, special parts, scoring, moves, and all existing game rules unchanged.
- Respect reduced-motion settings with a simplified instant clear.

## Technical details
- Track the active swap coordinates in the existing game view state and animate each tile using transform-only CSS before committing the swapped board visually.
- Render a lightweight effect layer inside clearing tiles, using CSS pseudo-elements/elements so effects stay aligned at every screen size.
- Adjust resolution timing to let the clear effect finish before gravity/refill begins.
- Verify the current build and the board interaction at mobile and desktop sizes.
