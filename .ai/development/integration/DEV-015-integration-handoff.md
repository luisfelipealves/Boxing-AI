---
integration_branch: agent/integration-dev-015-skip-ble-channel-confirmation
status: INTEGRATED
included_tasks:
  - DEV-015
included_commits:
  - 021c082
  - d2974c4
conflicts: none
ready_for_review: true
integrated_at: 2026-10-01T20:29:00Z
---

# Summary

Integrated DEV-015 from `agent/dev-015-skip-ble-channel-confirmation` into `agent/integration-dev-015-skip-ble-channel-confirmation` from `origin/main`.

# Conflict Resolution

No merge conflicts occurred.

# Validation

- `npm ci` — completed; reported existing audit warnings: 28 vulnerabilities and install-script approval warnings.
- `npm run test` — passed, 6 test files / 32 tests.
- `npm run build` — passed. Existing warnings: bundle chunk over 500 kB and Browserslist data age.
- `npx cap sync android` — passed.
- `./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: failed before tests because Android SDK location is not configured. `ANDROID_HOME` is unset and `android/local.properties` has no `sdk.dir`.

# Acceptance Criteria Verification

- Setup advances after discovering the configured B1 Pro service and characteristic.
- Blocking CCCD descriptor write / `onDescriptorWrite` confirmation was removed from setup.
- UI no longer says “Confirm B1 Pro BLE channel”; it now says “Find B1 Pro print service”.
- Printing proceeds after service/characteristic discovery using fixed model id `4097`.
- Print setup confirmation waits remain bounded; no indefinite setup wait is introduced.

# Known Issues / Risks

- Android Gradle validation still requires a configured Android SDK.
- Hardware validation is required to confirm target B1 Pro printing works without CCCD descriptor confirmation.
- If notification confirmations are unavailable, the app may still report `unconfirmed-print` after transfer starts, which is safer than hanging.
