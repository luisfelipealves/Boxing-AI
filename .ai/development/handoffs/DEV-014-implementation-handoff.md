---
task: DEV-014
status: IMPLEMENTED
branch: agent/dev-014-ble-channel-timeout
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-014-ble-channel-timeout
commit: 9b02eb05fa9a177f7d2db9bae82fc0e2069308e7
completed_at: 2026-10-01T19:58:00Z
---

# Summary

Implemented a bounded B1 Pro BLE channel preparation gate so Android direct BLE setup cannot remain indefinitely on the channel-confirmation step.

# Root Cause

`connectInternal` removed the connection timeout as soon as services were discovered. After that, `enableNotifications` could successfully enqueue `writeDescriptor(...)` and wait for `onDescriptorWrite(...)`. If Android never delivered the descriptor callback, the Capacitor call was left unresolved and the UI remained on the B1 Pro BLE channel confirmation step indefinitely.

# Change

- Added a one-shot `BleChannelPreparationGate` to ensure only one terminal outcome resolves each setup call.
- Kept the setup timeout active until BLE channel preparation succeeds, fails, disconnects, or times out.
- Added recoverable timeout/error paths for notification setup that never completes.
- Preserved fixed B1 Pro model id `4097`; no model-id query was reintroduced.
- Preserved NIIMBOT service/characteristic validation before selecting/printing.

# Files Changed

- `android/app/src/main/java/com/boxtrack/personal/NativePrintPlugin.java`
- `android/app/src/test/java/com/boxtrack/personal/NiimbotV4ProtocolTest.java`

# Validation

- `npm run test` — initially failed because worktree-local `node_modules/sql.js/dist/sql-wasm.wasm` was missing.
- `npm ci` — completed; reported existing audit warnings.
- `npm run test` — passed, 6 files / 32 tests.
- `npm run build` — passed.
- `npx cap sync android` — passed.
- `./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: Android SDK location is not configured. `ANDROID_HOME` is unset and `android/local.properties` has no `sdk.dir`.

# Known Issues

- Android Gradle validation still requires a configured Android SDK.
- Manual hardware validation remains required on the real NIIMBOT B1 Pro.
