# DEV-020 Independent Review

review_result: PASS
reviewed_at: 2026-10-03T07:22:35Z
reviewed_branch: agent/dev-020-niimbot-pageend-timeout
reviewed_commits:
  - 0f3420b2c17c87eabe6c758efbff58d0ab983cdb
  - 33eb3f8

# Blocking Findings

None.

# Non-Blocking Findings

- Test coverage for the new production behavior is weak: `NiimbotV4ProtocolTest` validates `initialPrintSetupPackets()`, but `NativePrintPlugin` does not use that helper; the app-level guard is a brittle source-text ordering check. Prefer a JVM-testable seam or refactor production setup sequencing to consume the helper being tested.

# Evidence

- Reviewed git diff `origin/main...HEAD` for `NativePrintPlugin.java`, `NiimbotV4Protocol.java`, `NiimbotV4ProtocolTest.java`, `services/niimbotBleFlowSource.test.ts`, and `.ai` task/handoff docs.
- `NativePrintPlugin.startPrintTransfer` now enqueues `NiimbotV4Protocol.INITIAL_CONNECTION_PACKET` at stage `ble-write-initial-connect` before `sendPrintSetup`; `sendPrintSetup` then sends SetDensity, SetLabelType, and PrintStart; page setup, row transfer, PageEnd, status polling, and PrintEnd remain in the existing sequence.
- The added initial packet is sent through the existing `BleWriteQueue`, preserving serialized `WRITE_TYPE_NO_RESPONSE` pacing and preventing PageEnd from overtaking raster data.
- Failure paths remain bounded: initial-connect rejection calls `failPrint` with staged diagnostics; delayed setup checks `session.resolved` before continuing; existing `sendWait` timeouts still prevent unbounded waits.
- Scope is controlled: code changes are limited to NIIMBOT native protocol sequencing and related tests/docs; label geometry, row encoding, QR/box semantics, and UI behavior were not changed.

# Review Validation

- `git diff --check origin/main...HEAD` — passed.
- `npm test -- --run services/niimbotBleFlowSource.test.ts` — passed, 1 file / 6 tests.
- `npm run test` — passed, 7 files / 44 tests, with only the existing mocked Gemini stderr output.
- `npm run build` — passed; Vite chunk-size and Browserslist-age warnings were emitted.
- `cd android && ./gradlew :app:testDebugUnitTest` — VALIDATION_NOT_RUN: Android SDK location is not configured via `ANDROID_HOME` or `android/local.properties` `sdk.dir`.
