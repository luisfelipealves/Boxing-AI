---
id: DEV-030
type: development
title: Remove NIIMBOT trace UI and automate B1 Pro setup
status: HUMAN_TESTING
source:
  - PD-011
depends_on: []
parallel_class: SERIAL
assigned_agent: Developer-DEV-030
branch: agent/dev-030-niimbot-auto-pairing
worktree: /home/felipe/.hermes/cache/scratch/boxing-ai-dev-030-auto-pairing
created_at: 2026-10-04
updated_at: 2026-10-04T11:37:48Z
completed_at: 2026-10-04T11:35:37Z
reviewed_at: 2026-10-04T11:37:48Z
---

# Objective

Implement approved PD-011 by removing the visible NIIMBOT diagnostic trace panel from the normal label-print screen and automating B1 Pro setup after Bluetooth permission is granted.

# Product Context

Product decision: `.ai/product/decisions/PD-011-niimbot-automatic-pairing.md`.

PD-011 is approved for development. It requires the app to keep the checklist visible, remove normal trace UI, and after Bluetooth grant automatically scan and connect/identify the single B1 Pro candidate without extra user interaction.

# Scope

- Remove visible `NIIMBOT print trace`, trace entries, trace Clear button, and normal UI subscription/state for trace rows from `App.tsx`.
- Keep lower-level/native diagnostic emitters intact unless unused by UI.
- After Bluetooth permission is granted, automatically scan when no selected printer exists.
- If the scan finds exactly one candidate, automatically identify/prepare it and persist it through the existing native plugin behavior.
- If the scan finds zero candidates, show no-printer-found guidance and retry/rescan path.
- If the scan finds multiple candidates, show the existing manual candidate chooser and do not auto-pick.
- Keep the setup checklist visible and update permission/setup, scanning, identifying/preparing, rendering, sending, and confirming states.
- Preserve selected-printer identity display, rescan/change, reconnect, forget, print, and retry-same-label behavior.
- Add/update automated source/helper tests for the trace absence and automatic setup flow.

# Out of Scope

- Changing native BLE protocol sequence, print raster geometry, QR payload semantics, box-number behavior, printer status mapping, signing, or release workflow.
- Supporting NIIMBOT B1 or other NIIMBOT models.
- Adding a debug mode or advanced diagnostics UI.
- Auto-selecting when multiple candidates are found.

# Technical Notes

Relevant files:

- `App.tsx` contains `BoxLabelPage`, current trace state/panel, manual scan button, candidate chooser, permission request, scan, identify, print, retry, and checklist UI.
- `services/niimbotUi.ts` contains checklist helpers and error presentation.
- `services/niimbotBleFlowSource.test.ts` currently guards source-level B1 Pro flow behavior and still expects the trace panel.
- `services/niimbotUi.test.ts` covers checklist/error helper behavior.
- `services/niimbot.ts` defines bridge types and B1 Pro model constraints.

Implementation should guard automatic setup to avoid repeated scan loops from React re-renders. A `useRef` guard is acceptable if paired with reset behavior for user retry/forget.

# Acceptance Criteria

- Normal label-print screen no longer renders `NIIMBOT print trace`, trace entries, native opcode rows, or trace `Clear` button.
- React screen no longer subscribes to or appends native `niimbotTrace` entries for normal UI rendering.
- After successful Bluetooth permission grant, if no printer is selected, the app automatically scans without a second tap.
- If exactly one candidate is found, the app automatically identifies/prepares it without requiring candidate selection.
- If multiple candidates are found, candidates are displayed for manual selection and no candidate is auto-picked.
- If no candidates are found, the no-printer-found error/recovery path remains visible.
- Setup checklist stays visible and reflects automatic progress.
- Selected printer identity and `50 × 30 mm` profile remain visible before printing.
- Rescan/change/reconnect/forget controls remain available after selection.
- Retry after recoverable print failure keeps the same label snapshot.
- Source/helper tests assert trace UI absence and automatic pairing behavior.

# Validation

- `npm run test -- --run services/niimbotBleFlowSource.test.ts`
- `npm run test -- --run services/niimbotUi.test.ts`
- `npm run test`
- `npm run build`
- `npx cap sync android`
- `./gradlew :app:assembleDebug` from `android/` with local SDK configured when available

# Implementation Handoff

Handoff: `.ai/development/handoffs/DEV-030-niimbot-automatic-pairing.md`

Branch: `agent/dev-030-niimbot-auto-pairing`

Worktree: `/home/felipe/.hermes/cache/scratch/boxing-ai-dev-030-auto-pairing`

Commit: `0b54f51799ae8b050f6517e8d4d3f91739c9cc47`

# Validation Result

- `npm run test -- --run services/niimbotBleFlowSource.test.ts` — passed: 8 tests.
- `npm run test -- --run services/niimbotUi.test.ts` — passed: 8 tests.
- `npm run test` — passed: 7 files, 46 tests.
- `npm run build` — passed with existing Vite chunk-size and Browserslist warnings.
- `npx cap sync android` — passed.
- `(cd android && ./gradlew :app:assembleDebug)` — passed after configuring local SDK path.

# Review

- PASS — `.ai/development/reviews/DEV-030-niimbot-automatic-pairing-review.md`
- Non-blocking: tests are source guards rather than full behavioral React/plugin tests.

# Human Testing

Status: READY

Manual validation:

1. Install the DEV-030 Android build.
2. Open a box label print screen.
3. Verify there is no `NIIMBOT print trace` panel or trace `Clear` button.
4. If Bluetooth permission is not granted, tap `Grant Bluetooth access`.
5. Verify the checklist automatically advances to scanning without pressing a separate Scan button.
6. With one NIIMBOT B1 Pro nearby, verify the app automatically prepares/selects it without tapping a candidate.
7. Verify the selected printer card and `50 × 30 mm` profile remain visible.
8. Print the current label and verify success or actionable recovery messaging.
9. If possible, test no-printer-found by turning the printer off and retrying setup.

Merge status: NOT MERGED — awaiting explicit human approval.
