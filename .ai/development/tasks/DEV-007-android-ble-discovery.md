---
id: DEV-007
type: development
title: Implement Android Bluetooth permissions, scanning, identification, and persisted printer selection
status: IMPLEMENTED
source:
  - PD-010
depends_on:
  - DEV-006
parallel_class: PARALLEL_CONDITIONAL
parallel_notes:
  - Depends on the bridge contract and profile constants from DEV-006.
  - Shares native plugin API with DEV-008 and UI API with DEV-010.
assigned_agent: Developer-DEV-007
branch: agent/dev-007-android-ble-discovery
worktree: worktrees/dev-007
created_at: 2026-10-01
updated_at: 2026-10-01
completed_at: 2026-10-01
---

# Objective

Implement Android BLE permission handling, scanning, B1 Pro identification, and persisted selected-printer metadata.

# Product Context

Product decision: `.ai/product/decisions/PD-010-niimbot-b1-pro-direct-ble-printing.md`.

# Scope

- Update `android/app/src/main/AndroidManifest.xml` for BLE permissions.
- Replace or supplement `NativePrintPlugin.java` with an explicit Niimbot BLE plugin API.
- Add runtime permission status/request methods.
- Add scan/connect/identify selected-printer methods.
- Persist selected printer metadata only after successful B1 Pro identification.

# Out of Scope

- Full print transfer protocol.
- Label bitmap rendering.
- React UI presentation beyond API compatibility if needed.

# Acceptance Criteria

- Manifest declares required BLE permissions for supported Android API levels.
- Plugin exposes explicit permission status/request, scan, connect/identify, selected-printer read, and forget-printer methods.
- Scan returns B1 candidates without treating B1-like names as proof of support.
- Identification accepts model id 4097 and rejects model id 4096/unsupported models before persistence.
- Persisted metadata includes display/reconnect/profile identity and print callers must re-identify before printing.
- Stable bridge error codes cover permission denied, Bluetooth unavailable/off, no device found, connection failure, missing service/characteristic, identification failure, and unsupported model.

# Validation

- `npm run test`
- `npm run build`
- `npx cap sync android`
- `cd android && ./gradlew :app:assembleDebug` or document VALIDATION_NOT_RUN with blocker.

# Dependencies

- DEV-006 implemented.

# Implementation Handoff

Handoff: `.ai/development/handoffs/DEV-007-android-ble-discovery.md`

Branch: `agent/dev-007-android-ble-discovery`

Worktree: `/home/felipe/projetos/Boxing-AI/worktrees/dev-007`

Commit: `9be38e92269acd07eb037b2e7a819d72906be9c9`

# Validation Result

- `npm run test` — passed: 4 test files, 22 tests.
- `npm run build` — passed with existing chunk-size and Browserslist warnings.
- `npx cap sync android` — passed.
- `cd android && ./gradlew :app:assembleDebug` — VALIDATION_NOT_RUN: Android SDK is not configured in this environment.

# Handoff

- Handoff: `.ai/development/handoffs/DEV-007-android-ble-discovery.md`
- Branch: `agent/dev-007-android-ble-discovery`
- Worktree: `/home/felipe/projetos/Boxing-AI/worktrees/dev-007`
- Commit: `9be38e92269acd07eb037b2e7a819d72906be9c9`

# Implementation Summary

- Added Android BLE permission declarations for Android 12+ and pre-Android-12 discovery support.
- Replaced the Android Print Framework path with a `NiimbotBlePrinter` Capacitor plugin API for permission status/request, scan, connect, identify, selected-printer read, selected-printer forget, disconnect, and print placeholder compatibility.
- Implemented B1-candidate BLE scan without treating names as proof, B1 Pro model-id identification, rejection of B1/unsupported models before persistence, and selected-printer metadata persistence after successful B1 Pro identification only.
- Updated TypeScript bridge contracts and tests for selected-printer metadata.

# Validation Summary

- PASS: `npm run test`
- PASS: `npm run build`
- PASS: `npx cap sync android`
- VALIDATION_NOT_RUN: `cd android && ./gradlew :app:assembleDebug` blocked by missing Android SDK configuration (`ANDROID_HOME` unset and no `android/local.properties` sdk.dir).
