---
integration_branch: agent/integration-dev-014-ble-channel-timeout
status: INTEGRATED
included_tasks:
  - DEV-014
included_commits:
  - 9b02eb05fa9a177f7d2db9bae82fc0e2069308e7
  - e4a1059
conflicts: none
ready_for_review: true
integrated_at: 2026-10-01T20:00:00Z
---

# Summary

Integrated DEV-014 from `agent/dev-014-ble-channel-timeout` into `agent/integration-dev-014-ble-channel-timeout` from `origin/main`.

# Conflict Resolution

No merge conflicts occurred.

# Validation

- `npm ci` — completed; reported existing audit warnings: 28 vulnerabilities and install-script approval warnings.
- `npm run test` — passed, 6 test files / 32 tests.
- `npm run build` — passed. Existing warnings: bundle chunk over 500 kB and Browserslist data age.
- `npx cap sync android` — passed.
- `./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: failed before tests because Android SDK location is not configured. `ANDROID_HOME` is unset and `android/local.properties` has no `sdk.dir`.

# Acceptance Criteria Verification

- BLE channel setup timeout remains active until notification setup reaches a terminal outcome.
- A missing `onDescriptorWrite` callback can no longer leave the Capacitor call unresolved indefinitely.
- Timeout/failure paths return recoverable `connection-failed` errors instead of infinite progress.
- Fixed B1 Pro model id `4097` behavior from DEV-013 remains intact.
- NIIMBOT service and characteristic validation remain in place.

# Known Issues / Risks

- Android Gradle validation still needs a machine with Android SDK configured.
- Manual hardware validation on a real NIIMBOT B1 Pro remains required to confirm the app advances and prints.
