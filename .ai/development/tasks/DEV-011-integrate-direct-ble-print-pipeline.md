---
id: DEV-011
type: development
title: Integrate direct BLE print pipeline and remove supported Android Print Framework path
status: INTEGRATED
source:
  - PD-010
depends_on:
  - DEV-007
  - DEV-008
  - DEV-009
  - DEV-010
parallel_class: SERIAL
assigned_agent: Integrator-DEV-011
branch: agent/integration-pd-010-niimbot-direct-ble
worktree: worktrees/integration-pd-010
created_at: 2026-10-01
updated_at: 2026-10-01
completed_at: 2026-10-01
---

# Objective

Integrate discovery, protocol, renderer, and UI work into one direct BLE B1 Pro print pipeline.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

# Scope

- Merge DEV-007 through DEV-010 branches into the integration branch/worktree.
- Resolve shared bridge/API conflicts.
- Remove or neutralize old Android PrintManager implementation for the supported Android path.
- Verify end-to-end flow from selected box to B1 Pro BLE transfer as far as automated validation allows.

# Out of Scope

- Final merge to main.
- Human hardware acceptance.

# Acceptance Criteria

- Supported Android box-label printing path no longer invokes PrintManager, PrintDocumentAdapter, PrintAttributes, Android print dialogs, print services, or system-printer discovery.
- App registers and calls the explicit B1 Pro BLE plugin/API instead of the old one-method `NativePrint.print` contract.
- Persisted printers are re-identified before printing and unsupported model ids are rejected.
- The same box id produces the same QR payload across setup failures, retries, and final print attempts.
- Integrated implementation satisfies all PD-010 automated acceptance criteria that do not require physical hardware.

# Validation

- `npm run test`
- `npm run build`
- `npx cap sync android`
- `cd android && ./gradlew :app:testDebugUnitTest` if Android SDK is configured.
- `cd android && ./gradlew :app:assembleDebug` or document VALIDATION_NOT_RUN with blocker.

# Dependencies

- DEV-007 implemented.
- DEV-008 implemented.
- DEV-009 implemented.
- DEV-010 implemented.

# Integration Handoff

Handoff: `.ai/development/integration/DEV-011-pd-010-integration.md`

Branch: `agent/integration-pd-010-niimbot-direct-ble`

Worktree: `/home/felipe/projetos/Boxing-AI/worktrees/integration-pd-010`

Integration commit: `18da0f9eeb2de24c7b4eda660a8ca32288ce729e`

Review-fix commit: `53daeb8`

# Validation Result

- `npm run test` — passed: 6 files, 32 tests.
- `npm run build` — passed with existing chunk-size and Browserslist warnings.
- `npx cap sync android` — passed.
- Android Print Framework reference inspection — passed for visible source tree excluding `.ai`, `node_modules`, `dist`, and `build`.
- `cd android && ./gradlew :app:assembleDebug` — VALIDATION_NOT_RUN: Android SDK is not configured in this environment.
- Review blocking fix validation — `npm run test -- --run services/niimbotUi.test.ts`, `npm run test`, `npm run build`, `npx cap sync android`, and `javac` protocol check passed.
