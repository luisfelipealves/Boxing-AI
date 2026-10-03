---
task: DEV-018
status: IMPLEMENTED
branch: agent/dev-018-ble-write-queue
worktree: /home/felipe/.hermes/cache/scratch/boxing-ai-dev-018-ble-write-queue
implemented_at: 2026-10-03T03:51:09Z
---

# Summary

Implemented a native Android BLE write queue for NIIMBOT B1 Pro printing. The previous implementation wrote every raster row directly through `BluetoothGatt.writeCharacteristic` in a tight loop; Android can reject writes when its GATT/controller queue is busy. The new `BleWriteQueue` serializes writes, retries synchronous Android rejections, and drains raster rows one at a time before sending `PageEnd`.

# Files Changed

- `android/app/src/main/java/com/boxtrack/personal/BleWriteQueue.java`
- `android/app/src/main/java/com/boxtrack/personal/NativePrintPlugin.java`
- `android/app/src/test/java/com/boxtrack/personal/BleWriteQueueTest.java`
- `.ai/development/tasks/DEV-018-ble-write-queue.md`
- `.ai/development/handoffs/DEV-018-implementation-handoff.md`

# Implementation Notes

- `NativePrintPlugin` now routes all NIIMBOT command and row writes through `BleWriteQueue`.
- Raster transfer uses `sendRowsSequentially`; `PageEnd` is queued only after all row packets are accepted/paced.
- `onCharacteristicWrite` releases the queue when Android delivers the callback; a bounded fallback delay releases it when `WRITE_TYPE_NO_RESPONSE` does not produce callbacks on the device stack.
- `onCharacteristicWrite` is marshalled onto the plugin main handler, but the queue intentionally ignores `WRITE_TYPE_NO_RESPONSE` completion callbacks and uses fallback pacing as the single completion source. This prevents a late callback for packet A from being attributed to packet B after fallback pacing has advanced.
- Synchronous Android write rejection now retries before failing.
- Failures include stage diagnostics such as `ble-write-raster-row-0` instead of only `device=...`.
- `transferStarted` is now set only after the first raster row is accepted, so a pre-row write rejection reports as transmission failure rather than misleading `unconfirmed-print`.

# Tests / Validation

- Red-capable focused Gradle test attempt before full environment setup failed because Capacitor generated files were absent.
- `npm run test` — passed, 7 files / 37 tests.
- `npm run build` — passed with existing Vite chunk-size and Browserslist-age warnings.
- `npx cap sync android` — passed.
- `javac` + standalone harness for `BleWriteQueue` — passed: serialized writes, retry rejection, and queue drain behavior verified.
- Follow-up reviewer fixes — `javac` + standalone harness for `BleWriteQueue`, `npm run test -- --run services/niimbotUi.test.ts`, and `git diff --check` passed.
- Follow-up late-callback race fix — `javac` + standalone harness for `BleWriteQueue` and `git diff --check` passed.
- `git diff --check` — passed.
- `cd android && ./gradlew :app:testDebugUnitTest --tests com.boxtrack.personal.BleWriteQueueTest` — VALIDATION_NOT_RUN: failed before Java compilation because Android SDK location is not configured. `ANDROID_HOME` is unset and `android/local.properties` has no `sdk.dir`.

# Known Issues

- Android Gradle validation still requires a configured Android SDK.
- Manual hardware validation is required to confirm the B1 Pro now prints or, if Android still rejects a write, reports a staged diagnostic.

# Manual Test Focus

1. Install an Android build from `agent/dev-018-ble-write-queue` or its integration branch.
2. Select the NIIMBOT B1 Pro.
3. Print the current label.
4. Verify the app no longer fails immediately with `BLE write was not accepted by Android` during raster transfer.
5. If a write still fails, verify the diagnostic includes `stage=ble-write-...` plus the device id.
6. Verify the physical 50 × 30 mm label prints with readable box number and scannable QR code.
