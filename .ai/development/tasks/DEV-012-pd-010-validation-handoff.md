---
id: DEV-012
type: development
title: Add validation coverage, Android build checks, and hardware test handoff for PD-010
status: HUMAN_TESTING
source:
  - PD-010
depends_on:
  - DEV-011
parallel_class: SERIAL
assigned_agent: Coordinator
branch: agent/integration-pd-010-niimbot-direct-ble
worktree: worktrees/integration-pd-010
created_at: 2026-10-01
updated_at: 2026-10-01
completed_at: 2026-10-01
---

# Objective

Complete integrated validation coverage and prepare concrete human hardware test instructions for PD-010.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

# Scope

- Expand/verify automated coverage for profile constants, model selection, protocol helpers, raster sizing/packing, and UI state where feasible.
- Run complete validation commands.
- Record Android build result or exact blocker.
- Persist integration/review/human-testing handoff artifacts.

# Out of Scope

- Performing the physical human hardware test.
- Merging to main.

# Acceptance Criteria

- `npm run test` passes after implementation.
- `npm run build` passes after implementation.
- `npx cap sync android` passes after implementation.
- Android debug build command is run and result is recorded; if SDK configuration is unavailable, the exact blocker is documented as VALIDATION_NOT_RUN.
- Automated tests cover label profile constants, B1 Pro versus B1 rejection, bitmap sizing/packing where feasible, and NIIMBOT frame/protocol helpers.
- Manual human test instructions require printing at least one 50 × 30 mm label on real NIIMBOT B1 Pro hardware and checking no clipping, correct orientation, readable box number, and scannable QR code.

# Validation

- `npm run test`
- `npm run build`
- `npx cap sync android`
- `cd android && ./gradlew :app:testDebugUnitTest`
- `cd android && ./gradlew :app:assembleDebug`

# Dependencies

- DEV-011 integrated.

# Human Testing Handoff

Handoff: `.ai/development/handoffs/PD-010-human-testing.md`

Review: `.ai/development/reviews/DEV-011-pd-010-review.md`

Integration branch: `agent/integration-pd-010-niimbot-direct-ble`

Latest integration commit: `53daeb8`

# Validation Result

- `npm run test` — passed: 6 files, 32 tests.
- `npm run build` — passed with existing warnings.
- `npx cap sync android` — passed.
- `javac` protocol helper check — passed.
- Android debug build — VALIDATION_NOT_RUN: Android SDK is not configured in this environment.
- Independent re-review — READY_FOR_HUMAN_TESTING with no blocking findings.
