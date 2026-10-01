---
task: DEV-015
status: IMPLEMENTED
branch: agent/dev-015-skip-ble-channel-confirmation
worktree: /home/felipe/projetos/Boxing-AI/worktrees/dev-015-skip-ble-channel-confirmation
commit: 021c082
completed_at: 2026-10-01T20:27:00Z
---

# Summary

Implemented fixed B1 Pro service/characteristic discovery as the connected-channel contract. Setup no longer blocks on CCCD descriptor writes or `onDescriptorWrite` notification confirmation.

# Change

- Removed blocking CCCD descriptor setup from the Android direct BLE connect/identify/print setup path.
- Setup now advances once the configured NIIMBOT B1 Pro service and characteristic are discovered.
- Local notification routing is requested via `setCharacteristicNotification(...)` without enqueuing descriptor writes that can block or race immediate print commands.
- Fixed B1 Pro model id `4097` remains preserved; no model-id query was reintroduced.
- Print setup commands continue after bounded notification-confirmation timeouts.
- UI copy changed from “Confirm B1 Pro BLE channel” to “Find B1 Pro print service”.

# Files Changed

- `App.tsx`
- `android/app/src/main/java/com/boxtrack/personal/NativePrintPlugin.java`
- `services/niimbotUi.ts`

# Validation

- `npm run test` — passed after restoring worktree dependencies.
- `npm run build` — passed.
- `npx cap sync android` — passed.
- `./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: Android SDK location is not configured. `ANDROID_HOME` is unset and `android/local.properties` has no `sdk.dir`.

# Known Issues

- Hardware validation is still required to confirm the B1 Pro accepts printing without CCCD descriptor confirmation on the target device.
- If notification confirmations are not routed, late print confirmation may remain unavailable and the flow can report existing `unconfirmed-print` safety guidance after transfer starts.
