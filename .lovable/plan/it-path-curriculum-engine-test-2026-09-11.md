# IT PATH curriculum engine test

## Scope
Add only the eight requested test topics and their educational reading content. Preserve the current navigation, design system, centralized state, and honest zero user-progress state.

## Build
- Extend the existing `Topic` model with curriculum placement and learning metadata: certification, year, month, week, difficulty, prerequisites, and learning objectives.
- Seed one Year 1 foundation track and exactly eight stable-ID topics in the static curriculum registry.
- Add substantive lesson sections for every topic covering the core concept, why it matters, practical examples, and key takeaways. Keep lessons linked by `topicId`.
- Update My Path to present an accessible Year → Month → Week → Topic hierarchy using the existing visual system.
- Add a topic detail route keyed by stable topic ID. It will show all metadata, objectives, prerequisites, and the full topic-specific lesson text; unknown IDs will show a useful not-found state.
- Keep all progress and completion records untouched and at zero.

## Verification
- Open My Path and every one of the eight topic URLs on desktop and mobile.
- Confirm each page shows unique substantive content and the correct hierarchy metadata.
- Confirm topic completion remains zero, no horizontal overflow or app errors appear, and the build succeeds.
