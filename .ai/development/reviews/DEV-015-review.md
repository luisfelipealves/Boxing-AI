---
task: DEV-015
status: REVIEW_PASSED
reviewer: independent-subagent
reviewed_branch: agent/integration-dev-015-skip-ble-channel-confirmation
ready_for_human_testing: true
reviewed_at: 2026-10-01T20:31:00Z
---

# Verdict

Approve for human testing with non-blocking risks. No blocking findings.

# Blocking Findings

None.

# Non-Blocking Findings

- Native Android BLE behavior is still not covered by automated unit tests because Gradle validation cannot run without an Android SDK; the JS suite does not exercise `NativePrintPlugin` callback/timing behavior.
- With CCCD writes removed, Android may not receive notification confirmations on printers/firmware that require remote CCCD subscription. The implementation handles this safely with bounded waits and `unconfirmed-print` after label transfer starts, but successful `confirmed: true` results may be rare until hardware proves notifications still route via `setCharacteristicNotification` alone.
- `NativePrintPlugin` marks `transferStarted` immediately after the PrintStart command path, before raster row writes begin. If a later pre-row write fails, the UI may conservatively report `unconfirmed-print` even though no label rows were transferred. This is safe but less precise.
- No real B1 Pro hardware validation is present in automated review; human testing remains required.

# Review Notes

- Reviewed actual integration diff from `dbb9a29` / v0.0.21 to HEAD, not only summaries.
- Blocking CCCD descriptor flow was removed: no `BluetoothGattDescriptor`, no `pendingNotificationSetup`, no descriptor `00002902` write, and no wait for `onDescriptorWrite` before resolving setup/identify/print preparation.
- Service and characteristic validation are preserved for `e7810a71-73ae-499d-8c15-faa9aef0c3f2` and `bef8d6c9-9c21-4c9e-b632-bd58c1009f9f` before resolving or persisting the selected printer.
- Fixed B1 Pro model id `4097` behavior is preserved and no model-id query was reintroduced.
- `gatt.setCharacteristicNotification(characteristic, true)` is still requested locally; received notifications still route through `onCharacteristicChanged` into `responseWaiters`.
- `sendWait` remains bounded for setup and confirmation commands. The relaxed setup sequence continues through SetDensity, SetLabelType, PrintStart, and SetPageSize when responses are null, preventing indefinite waits when notifications are unavailable.
- Raster rows are written before `COMMAND_PAGE_END`. If PageEnd confirmation is unavailable, `failPrint` maps the result to `unconfirmed-print` because transfer started, which matches the safe behavior requested.
- Race/double-resolution controls remain acceptable through `BleChannelPreparationGate`, `PrintSession.resolved`, and bounded `responseWaiters` cleanup.
- Android Print Framework classes are not present in the supported Android path.
- UI copy no longer says “Confirm B1 Pro BLE channel”; it now says “Find B1 Pro print service”.

# Validation During Review

- `npm run test` — passed, 6 files / 32 tests.
- `npm run build` — passed with existing chunk-size and Browserslist warnings.
- `./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: missing Android SDK / `ANDROID_HOME`.

# Human Testing Focus

1. Confirm setup advances past “Find B1 Pro print service” when the printer shows green/connected.
2. Print one real 50 × 30 mm label.
3. Verify QR scans, box number is readable, orientation/cut are acceptable.
4. If the app reports `unconfirmed-print`, inspect the physical label; this may mean the printer printed but notification confirmation was unavailable.
