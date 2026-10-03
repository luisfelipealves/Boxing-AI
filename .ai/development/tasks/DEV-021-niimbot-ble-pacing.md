---
id: DEV-021
type: development
title: Pace NIIMBOT B1 Pro BLE writes using validated retry budget
status: IMPLEMENTED
source:
  - PD-010
depends_on:
  - DEV-020
parallel_class: SERIAL
assigned_agent: Hermes
branch: agent/dev-021-niimbot-ble-pacing
worktree: worktrees/dev-021-niimbot-ble-pacing
created_at: 2026-10-03
updated_at: 2026-10-03
completed_at: 2026-10-03
---

# Objective

Reduce Android BLE `buffer not ready` failures during NIIMBOT B1 Pro direct printing by matching the validated reference behavior for paced write-without-response retries.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

The investigation found that `iscarelli/niimbot-web-bluetooth` prints B1 Pro one protocol frame per BLE write, does not bundle writes, and retries transient write buffer failures up to 30 times with short 4 ms sleeps. The existing app already serialized writes and paced accepted packets, but only retried rejected writes 3 times.

# Scope

- Increase the native BLE write queue retry budget to 30 attempts with 4 ms retry delay.
- Keep the existing one-frame-per-write queue and accepted-write pacing.
- Surface the effective BLE write retry/pace settings in native diagnostics returned to the UI trace/error panel.
- Add regression tests for the reference retry budget and source guard.

# Out of Scope

- Changing B1 Pro protocol sequence, raster geometry, QR semantics, or label layout.
- Supporting other NIIMBOT models.
- Final merge to `main`.

# Acceptance Criteria

- Trace panel remains present in the updated branch.
- Native Android print path uses `BLE_WRITE_MAX_ATTEMPTS = 30`, `BLE_WRITE_RETRY_DELAY_MS = 4L`, and `BLE_WRITE_PACE_MS = 20L`.
- Diagnostics include BLE write settings for any returned bridge error.
- `npm run test` passes.
- `npm run build` passes.
- `npx cap sync android` passes.

# Validation

- `npm run test -- --run services/niimbotBleFlowSource.test.ts` — passed, 7 tests.
- `npm run test` — passed, 7 files / 45 tests.
- `npm run build` — passed with existing Vite chunk-size and Browserslist warnings.
- `npx cap sync android` — passed.
- `cd android && ./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: Android SDK location is not configured in this environment.

# Dependencies

- DEV-020 implemented and merged in `origin/main`.
