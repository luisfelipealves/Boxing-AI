---
integration_branch: agent/integration-dev-018-ble-write-queue
status: INTEGRATED
included_tasks:
  - DEV-018
included_commits:
  - bda9369011deded0a6b89e48ea43c822866759c3
  - d6e8844
conflicts: none
ready_for_review: true
ready_for_human_testing: true
integrated_at: 2026-10-03T04:01:12Z
---

# Summary

Integrated DEV-018 from `agent/dev-018-ble-write-queue` into `agent/integration-dev-018-ble-write-queue` from `origin/main`.

DEV-018 addresses the Android native BLE failure reported after v0.0.26: `BLE write was not accepted by Android`, no physical label printed, and the diagnostic only contained the device id.

# Conflict Resolution

No merge conflicts occurred.

# Acceptance Criteria Verification

- Raster row writes are routed through `BleWriteQueue` instead of being sent in a tight `writeCharacteristic` loop.
- The queue allows one in-flight Android write at a time and uses bounded retry for synchronous Android rejection.
- `PageEnd` is queued only after all row packets have been accepted/paced.
- `onCharacteristicWrite` is marshalled onto `mainHandler`, but `BleWriteQueue` ignores WRITE_TYPE_NO_RESPONSE completion callbacks and uses fallback pacing as the single completion source to avoid late-callback races.
- Permanent write rejection reports a staged diagnostic such as `stage=ble-write-raster-row-N; device=...`.
- `transferStarted` is set only after the first raster row is accepted, avoiding misleading `unconfirmed-print` before any raster reaches Android.

# Validation

- `npm ci` — completed; reported existing audit warnings: 28 vulnerabilities and install-script approval warnings.
- `npm run test` — passed, 7 test files / 37 tests.
- `npm run build` — passed with existing Vite chunk-size and Browserslist-age warnings.
- `npx cap sync android` — passed.
- Focused `javac` + standalone `BleWriteQueue` harness — passed.
- `git diff --check` — passed.
- `cd android && ./gradlew :app:testDebugUnitTest --tests com.boxtrack.personal.BleWriteQueueTest` — VALIDATION_NOT_RUN: failed before Java compilation because Android SDK location is not configured. `ANDROID_HOME` is unset and `android/local.properties` has no `sdk.dir`.

# Review

Independent review passed and is recorded in `.ai/development/reviews/DEV-018-review.md`.

# Known Issues / Risks

- Android Gradle validation still requires a configured Android SDK.
- Manual hardware validation is required to confirm the B1 Pro accepts the paced writes and prints the physical label.

# Human Testing Instructions

1. Install an Android build from `agent/integration-dev-018-ble-write-queue`.
2. Open a saved box label screen.
3. Confirm the NIIMBOT B1 Pro is selected and nearby.
4. Tap “Print current label to NIIMBOT B1 Pro”.
5. Verify the previous `BLE write was not accepted by Android` failure does not occur during raster transfer.
6. Verify the physical 50 × 30 mm label prints with readable box number and scannable QR code.
7. If printing still fails, copy the full message and diagnostic line; it should now include a `stage=ble-write-...` value in addition to `device=...`.
