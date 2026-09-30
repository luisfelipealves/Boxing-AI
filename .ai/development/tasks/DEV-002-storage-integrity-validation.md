ID: DEV-002
Status: HUMAN_TESTING
Product decision: PD-002
Branch: agent/dev-002-storage-integrity-validation
Created: 2026-09-30

Objective:
Implement PD-002 storage integrity validation so service/storage-layer writes reject invalid inventory relationships before persistence while preserving blocked-delete behavior.

Requirements:
- Creating a box must require an existing location.
- Creating a box must require an existing category.
- Updating a box must require the target box to exist.
- Updating a box must require the referenced location and category to exist.
- Creating an item must require an existing box.
- Moving an item must require the item and destination box to exist.
- Updating an item must require the item to exist.
- Deleting a location that contains boxes must remain blocked.
- Deleting a box that contains items must remain blocked.
- Integrity failures must return structured, recoverable errors suitable for user-facing messages.
- Blocked dependency errors must include the entity, dependency type, and dependency count when applicable.

Acceptance criteria:
- A storage/service call to create a box with an unknown location is rejected and does not persist a box.
- A storage/service call to create a box with an unknown category is rejected and does not persist a box.
- A storage/service call to update a box to an unknown location or category is rejected and leaves the existing box unchanged.
- A storage/service call to create an item for an unknown box is rejected and does not persist an item.
- A storage/service call to move an item to an unknown box is rejected and leaves the item in its previous box.
- Deleting a location with boxes remains blocked and returns dependency count.
- Deleting a box with items remains blocked and returns dependency count.
- Tests cover invalid references by calling the service/storage layer directly, not only through UI components.
- npm run test passes.
- npm run build passes.

Implementation:
- Added structured storage integrity errors for invalid references and missing target records.
- Validated box creation/update references to existing locations and categories before persistence.
- Validated item creation/move references to existing boxes and item update/move target existence before persistence.
- Preserved existing blocked-delete behavior with dependency metadata for locations with boxes and boxes with items.

Commits:
- 992f32455ceec045f36c3a1fd65ee1f74e5334c8 - Implement storage integrity validation.

Review:
- APPROVED by independent Reviewer; no blocking findings.

Tests:
- `npm run test -- services/storageService.test.ts` passed (11 tests).
- `npm run test` passed (16 tests).
- Coordinator verification: `npm run test` passed (16 tests across 3 files).

Build:
- `npm run build` passed; Vite emitted existing chunk-size and Browserslist currency warnings.
- Coordinator verification: `npm run build` passed; Vite emitted chunk-size and Browserslist currency warnings.

Human testing:
- Ready for human testing on branch `agent/dev-002-storage-integrity-validation`.
