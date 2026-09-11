# IT PATH Resources System

## Scope
Build the Resources page on the existing architecture and design system. Add no backend, authentication, or unrelated features.

## Implementation
- Expand the typed `Resource` model with provider, reusable topic IDs, certification ID, type, difficulty, access model, verification date, and status.
- Populate the static resource registry with a compact set of official, verified links useful to all eight existing topics; keep all user activity in the existing versioned LocalStorage state.
- Replace the current manual bookmark form with a searchable, filterable curated library using the existing controls and card styling.
- Add working topic, certification, type, difficulty, and free/paid filters, plus clear filters and a truthful no-results state.
- Add per-resource bookmark controls using the existing centralized bookmark actions.
- Add per-resource notes using the existing centralized note actions, including save and edit behavior.
- Preserve reuse by associating each resource with one or more topic IDs rather than duplicating resource records.

## Technical Details
- Keep static resources in `src/data/static-content.ts` and persisted bookmarks/notes in the current `UserData` store.
- Reuse stable resource IDs through `Bookmark.resourceId`; extend notes with an optional `resourceId` relationship.
- Advance the LocalStorage data version only if persisted model compatibility requires it, with safe sanitization for existing users.
- Use official source URLs that were checked to resolve successfully; display the recorded verification date and current status.

## Verification
- Open every resource and validate its topic/certification relationships and stable ID.
- Test search, every filter independently, combined filters, clear filters, and no-results behavior.
- Test resource bookmark add/remove and persistence after refresh.
- Test resource note save/edit and persistence after refresh.
- Check desktop and mobile rendering, console/runtime errors, and the production build.
