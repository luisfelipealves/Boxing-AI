---
task: DEV-016
status: IMPLEMENTED
branch: agent/dev-016-single-connect-print-flow
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-016-single-connect-print-flow
commit: 9d2da1e454f8aef2850a427a030ae9a5ef9f7c0a
completed_at: 2026-10-01T20:48:00Z
---

# Summary

Simplified the NIIMBOT B1 Pro UI flow to avoid redundant BLE connection/discovery cycles that could leave the app stuck on “Find B1 Pro print service”.

# Change

- Setup now uses one native `identify` call when selecting/reconnecting a B1 Pro.
- Removed the explicit JS `connect` call before `identify`.
- Printing no longer runs a separate JS `identify` immediately before `printLabel`.
- `printLabel` receives the selected printer reconnect id and lets the native print path reconnect/validate once.
- Removed the separate `connecting` progress step and updated copy to “Prepare selected B1 Pro”.
- Added source-guard tests to prevent reintroducing setup `connect` + `identify` and pre-print JS `identify`.

# Files Changed

- `App.tsx`
- `services/niimbotUi.ts`
- `services/niimbotUi.test.ts`
- `services/niimbotBleFlowSource.test.ts`

# Validation

- `npm run test -- services/niimbotBleFlowSource.test.ts` — RED before implementation.
- `npm run test -- services/niimbotBleFlowSource.test.ts services/niimbotUi.test.ts` — passed.
- `npm run test` — passed after restoring worktree dependencies; 7 files / 34 tests.
- `npm run build` — passed.
- `npx cap sync android` — passed.
- `./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: Android SDK location is not configured. `ANDROID_HOME` is unset and `android/local.properties` has no `sdk.dir`.

# Known Issues

- Android Gradle validation still requires a configured Android SDK.
- Hardware validation remains required on the real NIIMBOT B1 Pro.
